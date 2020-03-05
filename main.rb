# frozen_string_literal: true

require 'async'
require 'fileutils'
require 'json'

require_relative 'cache.rb'
require_relative 'term.rb'
require_relative 'utils.rb'

CACHE = Cache.new('data/cache.json')

def terms
  response = request('/StudentRegistrationSsb/ssb/courseSearch/getTerms?dataType=json&offset=1&max=1728')
  JSON.parse(response.body)
end

def async_process_term(term)
  Async do |_|
    term_code = term['code']
    FileUtils.mkdir_p("data/#{term_code}")
    term = Term.new(term_code)
    term.departments.each do |dept|
      async_process_dept(term, dept)
    end
  end
end

def async_process_dept(term, dept)
  puts "processing term=#{term.term_code}, dept=#{dept['code']}"
  Async do |_|
    sections_async = term.sections(dept).collect do |section|
      async_process_section(term, section)
    end
    sections = sections_async.map(&:wait)
    File.open("data/#{term.term_code}/#{dept['code']}.json", 'w') do |output|
      output.write(sections.to_json)
    end
    CACHE.update_to_disk
  end
end

def async_process_section(term, section)
  Async do |_task|
    section if section['faculty'].empty?
    section['faculty'] = section['faculty'].collect do |faculty|
      async_process_faculty(term, faculty)
    end
    section['faculty'].compact!
    section
  end
end

def async_process_faculty(term, faculty)
  Async do |_|
    display_name = faculty['displayName']
    unless CACHE.contains(display_name)
      person_data = term.get_faculty(faculty)
      CACHE.insert(display_name, person_data) if person_data
    end
    CACHE.read(display_name)
  end
end

def main
  Async do |_|
    terms.each do |term|
      async_process_term term
    end
  end
end

main

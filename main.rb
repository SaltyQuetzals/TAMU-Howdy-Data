require 'async'
require 'fileutils'
require 'json'

require_relative 'utils.rb'
require_relative 'scrape.rb'

def terms
  response = request('/StudentRegistrationSsb/ssb/courseSearch/getTerms?dataType=json&offset=1&max=1728')
  JSON.parse(response.body)
end

def async_process_term(term_code)
  Async do |_|
    FileUtils.mkdir_p("data/%s" % term_code)
    cookies = get_term_code_cookies term_code
    depts_for_term(term_code).each do |dept|
      async_process_dept(term_code, dept, cookies)
    end
  end
end

def get_term_code_cookies(term_code)
  form_data = { 'dataType' => 'json', 'term' => term_code }.to_json
  response = request('/StudentRegistrationSsb/ssb/term/search?mode=courseSearch', HttpMethod::POST, form_data)
  response.headers['set-cookie']
end

def depts_for_term(term_code)
  response = request('/StudentRegistrationSsb/ssb/classSearch/get_subject?searchTerm=&term=%s&offset=1&max=1728' % term_code)
  JSON.parse(response.body)
end

def async_process_dept(term_code, dept, cookies)
  Async do |task|
    # back to Hash for compatibility
    term_code = {'code' => term_code}
    puts "processing term %s, dept %s" % [term_code, dept['code']]
    # old code
    sections = list_sections_for_dept(dept, term_code, cookies)
    sections.collect do |section|
      section if section['faculty'].empty?
      section['faculty'] = section['faculty'].collect do |faculty|
        display_name = faculty['displayName']
        unless DISPLAY_NAME_CACHE.key? display_name
          detailed_professor = retrieve_professor(faculty['bannerId'], term_code, cookies)
          next if detailed_professor.nil?
        end
        DISPLAY_NAME_CACHE[display_name]
      end
      section['faculty'].compact!
      section
    end
    File.open("data/#{term_code['code']}/#{dept['code']}.json", 'w+') do |f|
      f.write(sections.to_json)
    end
    File.open(CACHE_FILE_LOCATION, 'w+') do |f|
      f.write(DISPLAY_NAME_CACHE.to_json)
    end
  end
end

def main
  Async do |_|
    terms.each do |term|
      async_process_term term['code']
    end
  end
end

main

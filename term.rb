# frozen_string_literal: true

require 'faraday'
require 'faraday-cookie_jar'
require 'json'
require 'typhoeus'
require 'typhoeus/adapters/faraday'
require 'uri'

HOSTNAME = 'https://compassxe-ssb.tamu.edu'

# Term stores cookies to correctly retrieve sections (and faculty?)
class Term
  attr_accessor :term_code

  def initialize(term_code)
    @term_code = term_code
    @client = Faraday.new(
      url: HOSTNAME
    ) do |builder|
      builder.use :cookie_jar
      builder.request :retry, max: 12, interval: 0.05,
                              interval_randomness: 0.5, backoff_factor: 2
      builder.adapter :typhoeus
    end

    add_cookies
  end

  def add_cookies
    endpoint = '/StudentRegistrationSsb/ssb/term/search?mode=courseSearch'
    form_data = { 'dataType' => 'json', 'term' => term_code }
    @client.post(endpoint) do |request|
      request.headers['Content-Type'] = 'application/x-www-form-urlencoded'
      request.body = URI.encode_www_form(form_data)
    end
  end

  def departments
    response = @client.get("/StudentRegistrationSsb/ssb/classSearch/get_subject?searchTerm=&term=#{@term_code}&offset=1&max=1728")
    JSON.parse(response.body)
  end

  def sections(dept)
    add_cookies
    collected = []
    total_sections = 420
    until collected.length >= total_sections
      response = @client.get("/StudentRegistrationSsb/ssb/searchResults/searchResults?txt_subject=#{dept['code']}&txt_term=#{@term_code}&pageOffset=#{collected.length}&pageMaxSize=144")

      json_response = JSON.parse(response.body)
      if json_response.nil?
        puts dept['code'], @term_code, 'yielded nil JSON response'
        next
      end

      collected += json_response['data']
      total_sections = json_response['totalCount']
    end

    collected
  end

  def parallel_process_sections(sections, cache)
    @client.in_parallel do
      sections.map do |section|
        section if section['faculty'].empty?
        section['faculty'] = parallel_process_faculty(section['faculty'], cache)
        section['faculty'].compact!
        section
      end
    end

    sections
  end

  def parallel_process_faculty(faculty_members, cache)
    @client.in_parallel do
      faculty_members.map do |faculty|
        get_faculty(faculty, cache)
      end
    end

    faculty_members
  end

  def get_faculty(faculty, cache)
    display_name = faculty['displayName']

    unless cache.contains(display_name)
      response = @client.get("/StudentRegistrationSsb/ssb/contactCard/retrieveData?bannerId=#{faculty['bannerId']}&termCode=#{@term_code}")

      response.on_complete do |resp|
        json_response = JSON.parse(resp.body)
        return nil if json_response['data']['personData'].empty?

        person_data = json_response['data']['personData']
        if person_data['cvExists']
          person_data['cvUrl'] = "#{HOSTNAME}#{person_data['cvUrl']}"
        end

        cache.insert(display_name, person_data)

        person_data
      end
    end

    cache.read(display_name) || response
  end
end

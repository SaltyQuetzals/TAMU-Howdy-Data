# frozen_string_literal: true

require 'net/http'
require 'uri'
require 'json'
require 'fileutils'

NUM_RETRIES = 10
PAGE_SIZE = 500
HOSTNAME = 'https://compassxe-ssb.tamu.edu'
CACHE_FILE_LOCATION = 'data/cache.json'
DISPLAY_NAME_CACHE = if File.file?(CACHE_FILE_LOCATION)
                       JSON.parse(File.read(CACHE_FILE_LOCATION))
                     else
                       {}
                     end

# @param [Object] request
# @param [URI::Generic] uri
# @param [Net::HTTP, nil] http
# @param [Integer] retries
# @return [Net::HTTPResponse]
def request_or_retry(request, uri, http = nil, retries = NUM_RETRIES)
  unless http
    http = Net::HTTP.new(uri.hostname, uri.port)
    http.use_ssl = true
  end
  http.request(request)
rescue StandardError => e
  retries -= 1
  puts e.message
  retry if retries.nonzero?
  raise e
end

def get_term_code_cookies(term_code)
  uri = URI.parse("#{HOSTNAME}/StudentRegistrationSsb/ssb/term/search?mode=courseSearch")
  request = Net::HTTP::Post.new(uri)
  request.form_data = { 'dataType' => 'json', 'term' => term_code['code'] }
  response = request_or_retry(request, uri)
  cookies = response.response['set-cookie']
  cookies
end

# @return [Array<Hash>]
def term_codes
  uri = URI.parse("#{HOSTNAME}/StudentRegistrationSsb/ssb/courseSearch/getTerms?dataType=json&offset=1&max=1000")
  request = Net::HTTP::Get.new(uri)
  response = request_or_retry(request, uri)
  JSON.parse(response.body)
end

# @param [Hash] term_code
def depts_for_term_code(term_code)
  uri = URI.parse("#{HOSTNAME}/StudentRegistrationSsb/ssb/classSearch/get_subject?searchTerm=&term=#{term_code['code']}&offset=1&max=10000")
  request = Net::HTTP::Get.new(uri)
  response = request_or_retry(request, uri)
  JSON.parse(response.body)
end

def retrieve_professor(banner_id, term_code, cookies)
  uri = URI.parse("#{HOSTNAME}/StudentRegistrationSsb/ssb/contactCard/retrieveData?bannerId=#{banner_id}&termCode=#{term_code['code']}")
  request = Net::HTTP::Get.new(uri)
  request['Cookie'] = cookies
  begin
    response = request_or_retry(request, uri)
    json_response = JSON.parse(response.body)
    return nil if json_response['data']['personData'].empty?

    detailed_professor = json_response['data']['personData']
    if detailed_professor['cvExists']
      detailed_professor['cvUrl'] = "#{HOSTNAME}#{detailed_professor['cvUrl']}"
    end
    detailed_professor
  rescue JSON::ParserError => e
    puts e
    retry
  end
end

# @param [Hash] dept
# @param [Hash] term_code
def list_sections_for_dept(dept, term_code, cookies)
  results = []
  all_collected = false
  until all_collected
    uri = URI.parse("#{HOSTNAME}/StudentRegistrationSsb/ssb/searchResults/searchResults?txt_subject=#{dept['code']}&txt_term=#{term_code['code']}&pageOffset=#{results.length}&pageMaxSize=#{PAGE_SIZE}")
    request = Net::HTTP::Get.new(uri)
    request['Cookie'] = cookies
    response = request_or_retry(request, uri)
    json_response = JSON.parse(response.body)
    if json_response.nil?
      puts dept, term_code, 'yielded nil JSON response'
      next
    end
    results += json_response['data']
    all_collected = json_response['totalCount'] <= results.length
  end
  results
end

def main
  term_codes.each do |term_code|
    puts term_code['code']
    departments = depts_for_term_code(term_code)
    FileUtils.mkdir_p("data/#{term_code['code']}")
    departments.each do |dept|
      cookies = get_term_code_cookies(term_code)
      puts dept['code']
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
end

main

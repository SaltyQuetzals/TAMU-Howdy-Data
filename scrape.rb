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

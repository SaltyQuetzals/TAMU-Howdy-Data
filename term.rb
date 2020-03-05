require 'faraday'
require 'faraday-cookie_jar'
require 'json'
require 'uri'

class Term
  attr_accessor :term_code

  def initialize(term_code)
    @term_code = term_code
    @client = Faraday.new(
      url: 'https://compassxe-ssb.tamu.edu',
    ) do |builder|
      builder.use :cookie_jar
      builder.request :retry, max: 12, interval: 0.05,
                      interval_randomness: 0.5, backoff_factor: 2
      builder.adapter Faraday.default_adapter
    end

    # add appropriate cookies to cookie jar of Term
    endpoint = '/StudentRegistrationSsb/ssb/term/search?mode=courseSearch'
    form_data = {'dataType' => 'json', 'term' => term_code}
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

  def get_faculty(faculty)
    response = @client.get("/StudentRegistrationSsb/ssb/contactCard/retrieveData?bannerId=#{faculty['bannerId']}&termCode=#{@term_code}")
    begin
      json_response = JSON.parse(response.body)
      return nil if json_response['data']['personData'].empty?

      person_data = json_response['data']['personData']
      if person_data['cvExists']
        person_data['cvUrl'] = "https://compassxe-ssb.tamu.edu#{person_data['cvUrl']}"
      end
      person_data
    rescue JSON::ParserError => parser_error
      puts parser_error
      retry
    end
  end
end

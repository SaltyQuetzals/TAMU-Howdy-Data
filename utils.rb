require 'faraday'

module HttpMethod
  GET = 0
  POST = 1
end

CONN = Faraday.new(
  url: 'https://compassxe-ssb.tamu.edu',
) do |conn|
  conn.request :retry, max: 12, interval: 0.05,
               interval_randomness: 0.5, backoff_factor: 2
end

def request(endpoint, method = HttpMethod::GET, form_data = nil)
  case method
  when HttpMethod::GET
    CONN.get do |request|
      request.url endpoint
    end
  when HttpMethod::POST
    CONN.post do |request|
      request.url endpoint
      request.body = form_data
    end
  else
    puts "poop"
  end
end

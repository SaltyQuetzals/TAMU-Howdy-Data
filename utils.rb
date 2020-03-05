require 'faraday'

module HttpMethod
  GET = 0
  POST = 1
end

CLIENT = Faraday.new(
  url: 'https://compassxe-ssb.tamu.edu',
) do |builder|
  builder.request :retry, max: 12, interval: 0.05,
                  interval_randomness: 0.5, backoff_factor: 2
  builder.adapter Faraday.default_adapter
end

def request(endpoint, method = HttpMethod::GET)
  case method
  when HttpMethod::GET
    CLIENT.get(endpoint)
  when HttpMethod::POST
    CLIENT.post(endpoint)
  else
    puts 'poop' # poop
  end
end

# frozen_string_literal: true

require 'rwlock'
require 'fileutils'
require 'json'

# File cache supporting concurrency
class Cache
  def initialize(file_name)
    @file_name = file_name
    @cache = if File.file?(file_name)
               JSON.parse(File.read(file_name))
             else
               {}
             end
    @rwlock = RWLock.new(420) # blaze it
  end

  def read(cache_key)
    value = nil
    @rwlock.read_sync do
      value = @cache[cache_key] if @cache.key?(cache_key)
    end

    value
  end

  def contains(cache_key)
    contains = false
    @rwlock.read_sync do
      contains = true if @cache.key?(cache_key)
    end

    contains
  end

  def insert(cache_key, cache_value)
    unless contains(cache_key)
      @rwlock.write_sync do
        @cache[cache_key] = cache_value
      end
    end
  end

  def update_to_disk
    File.open(@file_name, 'w') do |output|
      @rwlock.read_sync do
        output.write(@cache.to_json)
      end
    end
  end
end

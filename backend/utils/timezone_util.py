
import re

# Basic mapping of countries to default IANA timezones
# This is a fallback for when we can't find a city-specific match
COUNTRY_DEFAULTS = {
    'United States': 'America/New_York',
    'United Kingdom': 'Europe/London',
    'Germany': 'Europe/Berlin',
    'France': 'Europe/Paris',
    'India': 'Asia/Kolkata',
    'China': 'Asia/Shanghai',
    'Japan': 'Asia/Tokyo',
    'Australia': 'Australia/Sydney',
    'Canada': 'America/Toronto',
    'Brazil': 'America/Sao_Paulo',
    'Mexico': 'America/Mexico_City',
    'Singapore': 'Asia/Singapore',
    'United Arab Emirates': 'Asia/Dubai',
}

# City/State specific overrides
REGION_OVERRIDES = {
    'California': 'America/Los_Angeles',
    'San Francisco': 'America/Los_Angeles',
    'Los Angeles': 'America/Los_Angeles',
    'Colorado': 'America/Denver',
    'Arizona': 'America/Phoenix',
    'Texas': 'America/Chicago',
    'Chicago': 'America/Chicago',
    'New York': 'America/New_York',
    'New Jersey': 'America/New_York',
    'Massachusetts': 'America/New_York',
    'Georgia': 'America/New_York',
    'Washington': 'America/New_York',
    'London': 'Europe/London',
    'Berlin': 'Europe/Berlin',
    'Paris': 'Europe/Paris',
    'Netherlands': 'Europe/Amsterdam',
    'Switzerland': 'Europe/Zurich',
    'Dubai': 'Asia/Dubai',
    'Singapore': 'Asia/Singapore',
    'Mumbai': 'Asia/Kolkata',
    'Delhi': 'Asia/Kolkata',
    'Bangalore': 'Asia/Kolkata',
}

def find_iana_timezone(geo_data):
    """
    Attempts to find an IANA timezone string based on geo data.
    geo_data can be a dict (from Linkd API) or a string.
    """
    if not geo_data:
        return 'UTC'
        
    full_loc = ""
    country = ""
    city = ""
    
    if isinstance(geo_data, dict):
        full_loc = geo_data.get('full') or ""
        country = geo_data.get('country') or ""
        city = geo_data.get('city') or ""
    else:
        full_loc = str(geo_data)

    # 1. Try to find a region/city override in the full string
    for key, tz in REGION_OVERRIDES.items():
        if key.lower() in full_loc.lower():
            return tz
            
    # 2. Try city specifically
    if city:
        for key, tz in REGION_OVERRIDES.items():
            if key.lower() in city.lower():
                return tz
                
    # 3. Fallback to country default
    if country and country in COUNTRY_DEFAULTS:
        return COUNTRY_DEFAULTS[country]
        
    # 4. Final attempt: scan full string for country names
    for country_name, tz in COUNTRY_DEFAULTS.items():
        if country_name.lower() in full_loc.lower():
            return tz
            
    return 'UTC'

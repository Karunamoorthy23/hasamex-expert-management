# Apify Expert Filter and Search Process (Advanced Filtration)

This document provides a step-by-step explanation of how the application filters and searches for experts using the Apify API, based on the **Advanced Filtration ("Filter-First")** implementation in the `n8n_webhook.py` file.

## Step-by-Step Search Process

### 1. Webhook Trigger & Input Parsing
The workflow initiates when the backend receives a `POST` request at the `/api/v1/n8n/search-experts` endpoint from n8n.
*   **Data Extraction & Pre-Processing**: The system unpacks the `body` from n8n and extracts the project description.
*   **Requirement Discovery**: It runs a regex check on the `project_description` to identify any "years of experience" requirements (e.g., "minimum 2 years", "5+ years").

### 2. "Filter-First" Apify Payload Construction
Instead of fuzzy search queries, the application now utilizes structured LinkedIn filters in the Apify request to ensure high-quality initial results.
*   **Structured Fields**:
    *   `locations`: Passed as a list of target geographies.
    *   `currentCompanies`: Specifically targets the companies listed in the project.
    *   `currentJobTitles`: Targets the roles requested.
*   **Efficiency**: This forces LinkedIn's search engine to do the filtering *before* any profiles are scraped, significantly reducing irrelevant hits.

### 3. Apify Actor Execution
The system calls the **`harvestapi/linkedin-profile-search`** actor.
*   **ProfileScraperMode**: Set to `"Full"` to retrieve deep history, which is essential for the next filtration stage.
*   **Sample Size**: Fetches up to 10 profiles per combination to provide a healthy candidate pool.

### 4. Post-Scrape Filtration Funnel
Once the detailed profiles are received across all queries, they undergo a backend validation pipeline:
*   **Funnel Step 1: Experience Validation**:
    *   The `_calculate_total_experience` helper iterates through the expert's entire work history.
    *   It merges overlapping intervals to calculate **Total Years in Industry**.
    *   Profiles that fall below the project's minimum year requirement are discarded.
*   **Funnel Step 2: Relevance Scoring**:
    *   The backend scores each expert based on keyword overlap between their `bio`/`headline` and the `project_description` and `project_title`.
*   **Funnel Step 3: Elite Ranking**:
    *   Experts are sorted by **Relevance Score** followed by **Total Years of Experience**.

### 5. Database Upsert and Ranking
*   Only the **Top 15** finest matches are kept.
*   The `years_of_experience` field in the database is updated with the calculated total.

---

## Example Payloads (New Filter-First Format)

### A. Internal Apify Request (Structured)
Notice how we now use `currentCompanies` and `currentJobTitles` instead of just a single search query string.

```json
{
  "searchQuery": "", 
  "currentJobTitles": ["Regional Sales Manager"],
  "currentCompanies": ["Linc Limited"],
  "locations": ["India", "United States"],
  "profileScraperMode": "Full",
  "maxItems": 10,
  "takePages": 1
}
```

### B. Backend Final Response
The response now includes the calculated `years_of_experience` for each expert.

```json
{
  "message": "Found and stored 3 experts",
  "experts_found": 3,
  "experts": [
    {
      "expert_id": "EX-F92A88B1",
      "name": "Aditya Gupta",
      "headline": "Regional Sales Manager at Linc Limited",
      "years_of_experience": 12,
      "relevance_score": 8,
      "linkedin_url": "https://www.linkedin.com/in/aditya-gupta-linc"
    }
  ],
  "project_id": 11
}
```

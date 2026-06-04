#!/usr/bin/env python3
"""
Export Maps Data Script
Fetches/normalizes place data from Google Places API or JSON input files
and exports to the application's destination format.

Usage:
    python scripts/export-maps-data/export-maps-data.py
"""

import json
import os
import re
import sys
from dataclasses import dataclass, field
from datetime import datetime, timezone
from pathlib import Path
from typing import Any

import requests
from dotenv import load_dotenv

# ============================================================
# Paths
# ============================================================

SCRIPT_DIR = Path(__file__).resolve().parent
BASE_DIR = SCRIPT_DIR.parent.parent
MAPS_DIR = SCRIPT_DIR / "maps"
INPUT_DIR = SCRIPT_DIR / "input"
OUTPUT_FILE = SCRIPT_DIR / "output.json"
MOEDAS_PATH = BASE_DIR / "public" / "assets" / "json" / "moedas.json"

# ============================================================
# Configuration
# ============================================================

SUPPORTED_LANGUAGES = ["en", "pt-BR"]

LANGUAGE_MAP: dict[str, dict[str, str]] = {
    "short": {
        "en": "en",
        "pt-BR": "pt",
    },
    "spoken": {
        "BR": "pt",
        "PT": "pt",
    },
}

PLACES_API_BASE = "https://places.googleapis.com/v1"

FIELD_MASK_GET = (
    "id,"
    "displayName,"
    "shortFormattedAddress,"
    "postalAddress,"
    "primaryTypeDisplayName,"
    "types,"
    "rating,"
    "priceLevel,"
    "priceRange,"
    "googleMapsUri,"
    "websiteUri,"
    "reviewSummary,"
    "editorialSummary"
)

FIELD_MASK_SEARCH = (
    "places.id,"
    "places.displayName,"
    "places.shortFormattedAddress,"
    "places.postalAddress,"
    "places.primaryTypeDisplayName,"
    "places.types,"
    "places.rating,"
    "places.priceLevel,"
    "places.priceRange,"
    "places.googleMapsUri,"
    "places.websiteUri,"
    "places.reviewSummary,"
    "places.editorialSummary"
)

# ============================================================
# Load env
# ============================================================

load_dotenv(SCRIPT_DIR / ".env")

PLACES_API_KEY = os.getenv("PLACES_API_KEY", "")


# ============================================================
# Colors
# ============================================================

class Colors:
    BOLD = "\033[1m"
    GREEN = "\033[92m"
    YELLOW = "\033[93m"
    BLUE = "\033[94m"
    CYAN = "\033[96m"
    RED = "\033[91m"
    RESET = "\033[0m"


# ============================================================
# Data Models
# ============================================================

@dataclass
class DestinationData:
    """Represents the output destination format."""
    midia: str = ""
    regiao: str = ""
    nome: str = ""
    website: str = ""
    nota: str = ""
    valor: str = ""
    descricao: dict[str, str] = field(default_factory=dict)
    emoji: str = ""
    novo: bool = True
    mapa: str = ""
    criadoEm: str = ""
    instagram: str = ""
    id: str = ""

    def to_dict(self) -> dict[str, Any]:
        return {
            "midia": self.midia,
            "regiao": self.regiao,
            "nome": self.nome,
            "website": self.website,
            "nota": self.nota,
            "valor": self.valor,
            "descricao": self.descricao,
            "emoji": self.emoji,
            "novo": self.novo,
            "mapa": self.mapa,
            "criadoEm": self.criadoEm,
            "instagram": self.instagram,
            "id": self.id,
        }


# ============================================================
# File I/O Helpers
# ============================================================

def read_json(path: Path) -> dict[str, Any] | list[Any] | None:
    """Read and parse a JSON file. Returns None on failure."""
    try:
        with open(path, "r", encoding="utf-8") as f:
            return json.load(f)
    except (FileNotFoundError, json.JSONDecodeError, OSError) as e:
        print(f"{Colors.YELLOW}Warning: Could not read {path}: {e}{Colors.RESET}")
        return None


def write_json(path: Path, data: dict[str, Any]) -> bool:
    """Write a dict as JSON. Returns True on success."""
    try:
        with open(path, "w", encoding="utf-8") as f:
            json.dump(data, f, indent=2, ensure_ascii=False)
        return True
    except OSError as e:
        print(f"{Colors.RED}Error writing {path}: {e}{Colors.RESET}")
        return False


def load_moedas() -> dict[str, Any]:
    """Load the currency scale data."""
    data = read_json(MOEDAS_PATH)
    if data is None:
        return {}
    return data  # type: ignore[no-any-return]


def load_emoji_map() -> dict[str, dict[str, str]]:
    """Load the emoji-map.json file."""
    data = read_json(MAPS_DIR / "emoji-map.json")
    if data is None:
        return {"exact": {}, "wildcard": {}}
    return data  # type: ignore[no-any-return]


def load_price_level_map() -> dict[str, str]:
    """Load the price-level-map.json file."""
    data = read_json(MAPS_DIR / "price-level-map.json")
    if data is None:
        return {}
    return data  # type: ignore[no-any-return]


# ============================================================
# API Client
# ============================================================

class PlacesAPIClient:
    """Client for Google Places API (New)."""

    def __init__(self, api_key: str):
        self.api_key = api_key
        self.session = requests.Session()

    def _headers(self, language: str, field_mask: str = FIELD_MASK_GET) -> dict[str, str]:
        return {
            "X-Goog-Api-Key": self.api_key,
            "X-Goog-FieldMask": field_mask,
            "Accept-Language": language,
        }

    def get_place(self, place_id: str, language: str) -> dict[str, Any] | None:
        """Fetch place details by Place ID."""
        url = f"{PLACES_API_BASE}/places/{place_id}"
        try:
            resp = self.session.get(url, headers=self._headers(language), timeout=30)
            resp.raise_for_status()
            return resp.json()  # type: ignore[no-any-return]
        except requests.RequestException as e:
            print(f"{Colors.RED}API Error (get_place, {language}): {e}{Colors.RESET}")
            return None

    def search_text(self, query: str, language: str) -> dict[str, Any] | None:
        """Search for places by text query."""
        url = f"{PLACES_API_BASE}/places:searchText"
        body = {"textQuery": query, "pageSize": 3}
        try:
            resp = self.session.post(
                url, headers=self._headers(language, FIELD_MASK_SEARCH), json=body, timeout=30
            )
            resp.raise_for_status()
            return resp.json()  # type: ignore[no-any-return]
        except requests.RequestException as e:
            print(f"{Colors.RED}API Error (search_text, {language}): {e}{Colors.RESET}")
            return None


# ============================================================
# Data Extraction Helpers
# ============================================================

def safe_get(d: dict[str, Any], *keys: str, default: Any = "") -> Any:
    """Safely traverse nested dicts. Returns default if any key is missing."""
    for key in keys:
        if not isinstance(d, dict) or key not in d:
            return default
        d = d[key]
    return d if d is not None else default


def is_instagram_url(url: str) -> bool:
    """Check if a URL is an Instagram URL."""
    if not url:
        return False
    return "instagram.com" in url.lower()


def split_website_instagram(website_uri: str) -> tuple[str, str]:
    """Split website URI into (website, instagram) depending on URL type."""
    if not website_uri:
        return "", ""
    if is_instagram_url(website_uri):
        return "", website_uri
    return website_uri, ""


def round_rating(rating: Any) -> str:
    """Round rating to nearest integer and return as string."""
    if rating is None or rating == "":
        return ""
    try:
        return str(round(float(rating)))
    except (ValueError, TypeError):
        return ""


def utc_timestamp() -> str:
    """Return current UTC timestamp in ISO-8601 format."""
    return datetime.now(timezone.utc).strftime("%Y-%m-%dT%H:%M:%S.") + \
           datetime.now(timezone.utc).strftime("%f")[:3] + "Z"


# ============================================================
# Price Level Resolution
# ============================================================

def resolve_price_level(
    price_range: dict[str, Any] | None,
    price_level: str | None,
    moedas: dict[str, Any],
    price_level_map: dict[str, str],
) -> str:
    """
    Determine price level string ($, $$, etc.) from priceRange (priority 1)
    or priceLevel (priority 2). Falls back to "-".
    """
    # Priority 1: priceRange
    if price_range:
        start_price = price_range.get("startPrice", {})
        end_price = price_range.get("endPrice", {})
        if start_price and end_price:
            currency = start_price.get("currencyCode", "")
            start_val = start_price.get("units")
            end_val = end_price.get("units")
            if currency and start_val is not None and end_val is not None:
                try:
                    avg = (float(start_val) + float(end_val)) / 2
                    escala = moedas.get("escala_numerica", {}).get(currency, {})
                    for level_key in ["$", "$$", "$$$", "$$$$"]:
                        rng = escala.get(level_key)
                        if rng:
                            low = rng[0]
                            high = rng[1] if len(rng) > 1 else float("inf")
                            if low <= avg <= high:
                                return level_key
                except (ValueError, TypeError):
                    pass

    # Priority 2: priceLevel
    if price_level and price_level in price_level_map:
        return price_level_map[price_level]

    # Priority 3: fallback
    return "-"


# ============================================================
# Emoji Resolution
# ============================================================

def resolve_emoji(
    types_list: list[str] | None,
    emoji_map: dict[str, dict[str, str]],
) -> str:
    """
    Resolve emoji from a list of Google Places types using emoji-map.json.
    Tries exact match first, then wildcard match, then first-token matching.
    """
    if not types_list:
        return ""

    exact_map = emoji_map.get("exact", {})
    wildcard_map = emoji_map.get("wildcard", {})

    for t in types_list:
        # Exact match
        if t in exact_map:
            return exact_map[t]
        # Wildcard match
        for wc_key, wc_emoji in wildcard_map.items():
            if wc_key in t or t in wc_key:
                return wc_emoji

    # First-token matching: try matching first token of exact keys as prefix
    for t in types_list:
        for ex_key, ex_emoji in exact_map.items():
            ex_first = ex_key.split("_")[0]
            if ex_first and ex_first != ex_key and t.startswith(ex_first):
                return ex_emoji

    # First-token matching: wildcard keys as prefix
    for t in types_list:
        for wc_key, wc_emoji in wildcard_map.items():
            wc_first = wc_key.split("_")[0]
            if wc_first and wc_first != wc_key and t.startswith(wc_first):
                return wc_emoji

    return ""


def resolve_emoji_from_categories(
    categories: list[str],
    emoji_map: dict[str, dict[str, str]],
) -> str:
    """
    Resolve emoji from Pepler category fields.
    Tries each category, exact match first, then wildcard, then first word only,
    then first-token matching against exact and wildcard keys.
    Stops at first valid emoji found.
    """
    exact_map = emoji_map.get("exact", {})
    wildcard_map = emoji_map.get("wildcard", {})

    for category in categories:
        if not category:
            continue

        normalized = category.lower().replace(" ", "_")

        # Step 1: Exact match
        if normalized in exact_map:
            return exact_map[normalized]

        # Step 2: Wildcard match (substring)
        for wc_key, wc_emoji in wildcard_map.items():
            if wc_key in normalized or normalized in wc_key:
                return wc_emoji

        # Step 3: Try first word only (if multi-word)
        parts = normalized.split("_")
        if len(parts) > 1:
            first_word = parts[0]
            if first_word in exact_map:
                return exact_map[first_word]
            for wc_key, wc_emoji in wildcard_map.items():
                if wc_key in first_word or first_word in wc_key:
                    return wc_emoji

        # Step 4: Match first token of exact_map keys as prefix of category
        # (e.g. "pizzaria".startswith("pizza") → "pizza_restaurant" → 🍕)
        for ex_key, ex_emoji in exact_map.items():
            ex_first = ex_key.split("_")[0]
            if ex_first and ex_first != ex_key and normalized.startswith(ex_first):
                return ex_emoji

        # Step 5: Match first token of wildcard_map keys as prefix of category
        for wc_key, wc_emoji in wildcard_map.items():
            wc_first = wc_key.split("_")[0]
            if wc_first and wc_first != wc_key and normalized.startswith(wc_first):
                return wc_emoji

    return ""


# ============================================================
# Description Resolution
# ============================================================

def resolve_description(
    place_data: dict[str, Any],
) -> str:
    """
    Extract the best available description from a Places API response.
    Priority: editorialSummary.text > reviewSummary.text > primaryTypeDisplayName.text
    """
    editorial = safe_get(place_data, "editorialSummary", "text", default="")
    if editorial:
        return str(editorial)

    review = safe_get(place_data, "reviewSummary", "text", "text", default="")
    if review:
        return str(review)

    primary_type = safe_get(place_data, "primaryTypeDisplayName", "text", default="")
    return str(primary_type)


# ============================================================
# Google Places Transformer
# ============================================================

class GooglePlacesTransformer:
    """Transforms Google Places API data into DestinationData."""

    def __init__(
        self,
        moedas: dict[str, Any],
        emoji_map: dict[str, dict[str, str]],
        price_level_map: dict[str, str],
    ):
        self.moedas = moedas
        self.emoji_map = emoji_map
        self.price_level_map = price_level_map

    def transform(
        self,
        places_by_lang: dict[str, dict[str, Any] | None],
    ) -> DestinationData:
        """
        Transform Places API data keyed by language into a single DestinationData.
        Falls back to first available language for non-language-specific fields.
        """
        # Determine primary language (en preferred)
        primary_lang = "en" if "en" in places_by_lang and places_by_lang["en"] else None
        if primary_lang is None:
            # Use first available language
            for lang in SUPPORTED_LANGUAGES:
                if places_by_lang.get(lang):
                    primary_lang = lang
                    break

        if primary_lang is None:
            raise ValueError("No place data available for any language")

        primary = places_by_lang[primary_lang]
        if primary is None:
            raise ValueError("Primary language data is None")

        dest = DestinationData()

        # --- midia ---
        dest.midia = ""

        # --- regiao ---
        dest.regiao = str(safe_get(primary, "postalAddress", "sublocality", default=""))

        # --- nome ---
        dest.nome = str(safe_get(primary, "displayName", "text", default=""))

        # --- website / instagram ---
        website_uri = str(safe_get(primary, "websiteUri", default=""))
        dest.website, dest.instagram = split_website_instagram(website_uri)

        # --- nota ---
        dest.nota = round_rating(safe_get(primary, "rating", default=None))

        # --- valor ---
        price_range = primary.get("priceRange")
        price_level = primary.get("priceLevel")
        dest.valor = resolve_price_level(
            price_range, price_level, self.moedas, self.price_level_map
        )

        # --- descricao ---
        dest.descricao = {}
        for lang in SUPPORTED_LANGUAGES:
            short_key = LANGUAGE_MAP["short"].get(lang, lang)
            place = places_by_lang.get(lang)
            if place:
                dest.descricao[short_key] = resolve_description(place)
            else:
                dest.descricao[short_key] = ""

        # --- emoji ---
        types_list = primary.get("types")
        dest.emoji = resolve_emoji(types_list, self.emoji_map)

        # --- novo ---
        dest.novo = True

        # --- mapa ---
        dest.mapa = str(safe_get(primary, "googleMapsUri", default=""))

        # --- criadoEm ---
        dest.criadoEm = utc_timestamp()

        # --- id ---
        dest.id = str(safe_get(primary, "id", default=""))

        return dest


# ============================================================
# Pepler Transformer
# ============================================================

class PeplerTransformer:
    """Transforms Pepler Extension JSON data into DestinationData."""

    def __init__(
        self,
        emoji_map: dict[str, dict[str, str]],
        language_map: dict[str, dict[str, str]],
    ):
        self.emoji_map = emoji_map
        self.language_map = language_map

    def transform(self, pepler_item: dict[str, Any]) -> DestinationData:
        """Transform a single Pepler record into DestinationData."""
        dest = DestinationData()

        # --- midia ---
        dest.midia = ""

        # --- regiao ---
        dest.regiao = self._extract_region(pepler_item)

        # --- nome ---
        dest.nome = str(pepler_item.get("Business Name", ""))

        # --- website / instagram ---
        website_raw = str(pepler_item.get("Website", ""))
        dest.website, dest.instagram = split_website_instagram(website_raw)

        # --- nota ---
        dest.nota = round_rating(pepler_item.get("Rating"))

        # --- valor ---
        dest.valor = "default"

        # --- emoji ---
        categories = [
            pepler_item.get("Primary Category", ""),
            pepler_item.get("Category 2", ""),
            pepler_item.get("Category 3", ""),
            pepler_item.get("Category 4", ""),
            pepler_item.get("Category 5", ""),
            pepler_item.get("Category 6", ""),
            pepler_item.get("Category 7", ""),
            pepler_item.get("Category 8", ""),
        ]
        dest.emoji = resolve_emoji_from_categories(categories, self.emoji_map)

        # --- descricao ---
        dest.descricao = self._resolve_pepler_description(pepler_item)

        # --- novo ---
        dest.novo = True

        # --- mapa ---
        dest.mapa = self._clean_maps_link(pepler_item.get("Maps Link", ""))

        # --- criadoEm ---
        dest.criadoEm = utc_timestamp()

        # --- id ---
        dest.id = str(pepler_item.get("Place ID", ""))

        return dest

    def _extract_region(self, item: dict[str, Any]) -> str:
        """
        Extract region from Address using City as reference.
        Splits address by comma, finds element containing City, returns element N-1.
        Cleans number prefixes like "1 - Neighborhood" → "Neighborhood".
        Returns empty string if the candidate looks like a street (street, st, ave,
        rua, r., avenida) or contains a number (e.g. "abc 123").
        """
        address = str(item.get("Address", ""))
        city = str(item.get("City", ""))

        if not address or not city:
            return ""

        parts = [p.strip() for p in address.split(",")]

        for i, part in enumerate(parts):
            if city.lower() in part.lower():
                if i > 0:
                    candidate = parts[i - 1]
                    # Clean number prefix like "1 - Carlos Prates" → "Carlos Prates"
                    cleaned = re.sub(r"^\d+\s*-\s*", "", candidate).strip()
                    if not cleaned:
                        return ""
                    # Check if candidate looks like a street (not a region)
                    if self._is_street_like(cleaned):
                        return ""
                    return cleaned
                break

        return ""

    @staticmethod
    def _is_street_like(text: str) -> bool:
        """Check if text looks like a street name rather than a region."""
        lower = text.lower()
        street_indicators = ["street", "st ", "ave", "avenue", "rua", "rua ", "r.", "avenida", "road", "rd ", "lane", "ln "]
        for indicator in street_indicators:
            if indicator in lower:
                return True
        # Check if it contains a number (e.g. "R. Patrocínio, 1" or "Av 123")
        if re.search(r"\d", text):
            return True
        return False

    def _resolve_pepler_description(
        self, item: dict[str, Any]
    ) -> dict[str, str]:
        """
        Build description dict for Pepler data.
        Uses Country Code to determine language, populates only that language.
        Value priority: Description > Primary Category
        """
        desc_map: dict[str, str] = {}
        for lang in SUPPORTED_LANGUAGES:
            short_key = LANGUAGE_MAP["short"].get(lang, lang)
            desc_map[short_key] = ""

        # Determine spoken language from Country Code
        country_code = str(item.get("Country Code", "")).upper()
        spoken_lang = self.language_map.get("spoken", {}).get(country_code, "en")

        # Map spoken language to short key (may need reverse lookup)
        short_key = spoken_lang  # spoken already gives "pt" or "en"

        # Value priority: Description > Primary Category
        description = str(item.get("Description", ""))
        primary_category = str(item.get("Primary Category", ""))

        value = description if description else primary_category
        if short_key in desc_map:
            desc_map[short_key] = value
        else:
            # Ensure we populate at least the short key for the detected language
            desc_map[spoken_lang] = value

        return desc_map

    @staticmethod
    def _clean_maps_link(raw_link: str) -> str:
        """Remove HTML anchor tags from a Maps Link and return clean URL."""
        if not raw_link:
            return ""
        # Remove <a href="..."> tags
        match = re.search(r'href="([^"]+)"', raw_link)
        if match:
            return match.group(1)
        # If no HTML tags, return as-is
        return raw_link.strip()


# ============================================================
# CLI Helpers
# ============================================================

def prompt_choice(prompt: str, options: list[str]) -> int:
    """Display a numbered menu and return the user's choice (1-based)."""
    print(f"\n{Colors.BOLD}{prompt}{Colors.RESET}")
    for i, option in enumerate(options, 1):
        print(f"{Colors.BLUE}{i}{Colors.RESET} - {option}")

    while True:
        try:
            choice = input(f"\n{Colors.BOLD}> {Colors.RESET}").strip()
            idx = int(choice)
            if 1 <= idx <= len(options):
                return idx
        except ValueError:
            pass
        print(f"{Colors.RED}Invalid choice. Please select 1-{len(options)}.{Colors.RESET}")


def prompt_input(prompt: str) -> str:
    """Prompt the user for text input."""
    return input(f"\n{Colors.BOLD}{prompt}{Colors.RESET}\n> ").strip()


# ============================================================
# Data Source: Google Places API
# ============================================================

def run_google_places_flow(
    client: PlacesAPIClient,
    transformer: GooglePlacesTransformer,
) -> DestinationData | None:
    """Interactive flow for fetching data via Google Places API."""
    choice = prompt_choice("Choose search method:", ["Place ID", "Search Term"])

    if choice == 1:
        # --- Place ID ---
        place_id = prompt_input("Enter Place ID:")
        if not place_id:
            print(f"{Colors.RED}Place ID cannot be empty.{Colors.RESET}")
            return None

        places_by_lang: dict[str, dict[str, Any] | None] = {}
        for lang in SUPPORTED_LANGUAGES:
            print(f"{Colors.CYAN}Fetching place details ({lang})...{Colors.RESET}")
            places_by_lang[lang] = client.get_place(place_id, lang)

        return transformer.transform(places_by_lang)

    else:
        # --- Search Term ---
        search_term = prompt_input("Enter search text (add both the place name and city):")
        if not search_term:
            print(f"{Colors.RED}Search text cannot be empty.{Colors.RESET}")
            return None

        print(f"{Colors.CYAN}Searching for '{search_term}'...{Colors.RESET}")
        search_result = client.search_text(search_term, "en")
        if not search_result:
            print(f"{Colors.RED}Search returned no results.{Colors.RESET}")
            return None

        places_list = search_result.get("places", [])
        if not places_list:
            print(f"{Colors.YELLOW}No places found.{Colors.RESET}")
            return None

        # Display results
        print(f"\n{Colors.BOLD}Search Results:{Colors.RESET}")
        for i, place in enumerate(places_list, 1):
            name = safe_get(place, "displayName", "text", default="Unknown")
            ptype = safe_get(place, "primaryTypeDisplayName", "text", default="")
            addr = safe_get(place, "shortFormattedAddress", default="")
            print(f"{Colors.BLUE}{i}{Colors.RESET} - {name} ({ptype}) — {addr}")

        # Auto-select if only one result
        if len(places_list) == 1:
            idx = 1
            print(f"\n{Colors.GREEN}→ Auto-selected: {safe_get(places_list[0], 'displayName', 'text', default='Unknown')}{Colors.RESET}")
        else:
            while True:
                try:
                    sel = input(f"\n{Colors.BOLD}Select a result (1-{len(places_list)}):{Colors.RESET} ").strip()
                    idx = int(sel)
                    if 1 <= idx <= len(places_list):
                        break
                except ValueError:
                    pass
                print(f"{Colors.RED}Invalid selection.{Colors.RESET}")

        selected = places_list[idx - 1]
        place_id = selected.get("id", "")
        if not place_id:
            print(f"{Colors.RED}Selected place has no ID.{Colors.RESET}")
            return None

        # Use the search result as the English data, fetch for other languages
        places_by_lang = {}
        for lang in SUPPORTED_LANGUAGES:
            if lang == "en":
                places_by_lang[lang] = selected
            else:
                print(f"{Colors.CYAN}Fetching place details ({lang})...{Colors.RESET}")
                places_by_lang[lang] = client.get_place(place_id, lang)

        return transformer.transform(places_by_lang)


# ============================================================
# Data Source: JSON Input Files
# ============================================================

def ensure_input_files() -> None:
    """Create empty placeholder input files if they don't exist."""
    templates: dict[str, Any] = {
        "places_en.json": {},
        "places_pt.json": {},
        "pepler.json": {"data": []},
    }
    for filename, template in templates.items():
        file_path = INPUT_DIR / filename
        if not file_path.exists():
            with open(file_path, "w", encoding="utf-8") as f:
                json.dump(template, f, indent=2, ensure_ascii=False)
            print(f"{Colors.GREEN}→ Created empty {file_path.name}{Colors.RESET}")


def read_places_json(lang: str) -> dict[str, Any] | None:
    """Read a Places API JSON file for a given language."""
    file_path = INPUT_DIR / f"places_{lang}.json"
    data = read_json(file_path)
    if data is None:
        print(f"{Colors.YELLOW}No data found for language: {lang} ({file_path}){Colors.RESET}")
        return None
    return data  # type: ignore[no-any-return]


def run_google_places_json_flow(
    transformer: GooglePlacesTransformer,
) -> DestinationData | None:
    """Read Places API JSON files from input/ and transform."""
    places_by_lang: dict[str, dict[str, Any] | None] = {}
    for lang in SUPPORTED_LANGUAGES:
        places_by_lang[lang] = read_places_json(lang)

    # Check if any data was loaded
    if not any(places_by_lang.values()):
        print(f"{Colors.RED}No Places JSON files found in {INPUT_DIR}{Colors.RESET}")
        return None

    return transformer.transform(places_by_lang)


def run_pepler_json_flow(
    transformer: PeplerTransformer,
) -> list[DestinationData]:
    """Read Pepler JSON from input/ and transform all records."""
    file_path = INPUT_DIR / "pepler.json"
    data = read_json(file_path)
    if data is None:
        print(f"{Colors.RED}No pepler.json found in {INPUT_DIR}{Colors.RESET}")
        return []

    # Pepler format has "data" array
    records = []
    if isinstance(data, dict):
        pepler_items = data.get("data", [])
    elif isinstance(data, list):
        pepler_items = data
    else:
        print(f"{Colors.RED}Unexpected pepler.json format.{Colors.RESET}")
        return []

    for item in pepler_items:
        if isinstance(item, dict):
            records.append(transformer.transform(item))

    return records


# ============================================================
# Main
# ============================================================

def main() -> None:
    """Main entry point."""
    print(f"{Colors.BOLD}{Colors.CYAN}╔══════════════════════════════════╗{Colors.RESET}")
    print(f"{Colors.BOLD}{Colors.CYAN}║   Export Maps Data Script        ║{Colors.RESET}")
    print(f"{Colors.BOLD}{Colors.CYAN}╚══════════════════════════════════╝{Colors.RESET}")

    # Load reference data
    moedas = load_moedas()
    emoji_map = load_emoji_map()
    price_level_map = load_price_level_map()

    # Step 1: Choose data source
    source_choice = prompt_choice(
        "Choose data source:",
        ["Google Places API", "JSON Input Files"],
    )

    results: list[DestinationData] = []

    if source_choice == 1:
        # --- Google Places API ---
        if not PLACES_API_KEY:
            print(
                f"{Colors.RED}Error: PLACES_API_KEY not set. "
                f"Create scripts/export-maps-data/.env with your API key.{Colors.RESET}"
            )
            print(
                f"{Colors.YELLOW}Copy .env.example to .env and fill in your key.{Colors.RESET}"
            )
            sys.exit(1)

        client = PlacesAPIClient(PLACES_API_KEY)
        transformer = GooglePlacesTransformer(moedas, emoji_map, price_level_map)

        dest = run_google_places_flow(client, transformer)
        if dest:
            results.append(dest)
        else:
            print(f"{Colors.YELLOW}No data retrieved.{Colors.RESET}")
            sys.exit(0)

    else:
        # --- JSON Input Files ---
        ensure_input_files()

        format_choice = prompt_choice(
            "Choose format:\n"
            f"{Colors.YELLOW}For Pepler exports we recommend always exporting in English.{Colors.RESET}",
            ["Google Places API JSON", "Pepler Extension JSON"],
        )

        if format_choice == 1:
            # Google Places API JSON
            transformer = GooglePlacesTransformer(moedas, emoji_map, price_level_map)
            dest = run_google_places_json_flow(transformer)
            if dest:
                results.append(dest)
            else:
                print(f"{Colors.YELLOW}No data retrieved.{Colors.RESET}")
                sys.exit(0)

        else:
            # Pepler Extension JSON
            pepler_transformer = PeplerTransformer(emoji_map, LANGUAGE_MAP)
            results = run_pepler_json_flow(pepler_transformer)
            if not results:
                print(f"{Colors.YELLOW}No Pepler records found.{Colors.RESET}")
                sys.exit(0)

    # Write output — single object (first Pepler record if multiple)
    output_data = results[0].to_dict() if results else {}
    if len(results) > 1:
        print(f"{Colors.YELLOW}ℹ Multiple Pepler records found, exporting only the first.{Colors.RESET}")
    if write_json(OUTPUT_FILE, output_data):
        print(f"\n{Colors.GREEN}✓ Output written to {OUTPUT_FILE}{Colors.RESET}")
    else:
        print(f"{Colors.RED}✗ Failed to write output.{Colors.RESET}")
        sys.exit(1)


if __name__ == "__main__":
    main()

import re

_slug_strip = re.compile(r"[^a-z0-9]+")


def slugify(value: str) -> str:
    slug = _slug_strip.sub("-", value.lower()).strip("-")
    return slug or "org"

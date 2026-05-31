import copy
import re
from typing import Any


PHI_FIELDS: frozenset[str] = frozenset({
    "name", "first_name", "last_name", "full_name",
    "email", "email_address",
    "phone", "phone_number", "mobile",
    "dob", "date_of_birth", "birthdate",
    "ssn", "social_security_number",
    "address", "street_address", "city", "state", "zip_code", "postal_code",
    "patient_id", "mrn", "medical_record_number",
    "ip_address", "ip",
})

PHI_PATTERNS: list[re.Pattern] = [
    re.compile(r"\b\d{3}-\d{2}-\d{4}\b"),
    re.compile(r"\b\d{3}[-.\s]?\d{3}[-.\s]?\d{4}\b"),
    re.compile(r"\b[A-Za-z0-9._%+\-]+@[A-Za-z0-9.\-]+\.[A-Za-z]{2,}\b"),
]


class PHIScrubber:
    @staticmethod
    def scrub_dict(data: dict[str, Any] | None) -> dict[str, Any] | None:
        if data is None:
            return None
        return _scrub_value(copy.deepcopy(data))

    @staticmethod
    def scrub_processor(logger, method_name: str, event_dict: dict) -> dict:
        return _scrub_value(event_dict)


def _scrub_value(value: Any) -> Any:
    if isinstance(value, dict):
        return {
            k: "[REDACTED]" if k.lower() in PHI_FIELDS else _scrub_value(v)
            for k, v in value.items()
        }
    if isinstance(value, list):
        return [_scrub_value(item) for item in value]
    if isinstance(value, str):
        result = value
        for pattern in PHI_PATTERNS:
            result = pattern.sub("[REDACTED]", result)
        return result
    return value

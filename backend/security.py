import base64
import hashlib
import hmac
import secrets


def _normalize_secret(value: str) -> str:
    return value.strip().upper()


def generate_invite_code() -> str:
    parts = [secrets.token_hex(2).upper() for _ in range(3)]
    return f"BLT-{'-'.join(parts)}"


def generate_private_token() -> str:
    return secrets.token_urlsafe(32)


def hash_invite_code(code: str) -> str:
    return hash_secret(_normalize_secret(code))


def verify_invite_code(code: str, digest: str) -> bool:
    return verify_secret(_normalize_secret(code), digest)


def hash_secret(secret: str) -> str:
    salt = secrets.token_bytes(16)
    derived = hashlib.pbkdf2_hmac("sha256", secret.encode("utf-8"), salt, 120_000)
    return "pbkdf2_sha256${}${}".format(
        base64.urlsafe_b64encode(salt).decode("ascii"),
        base64.urlsafe_b64encode(derived).decode("ascii"),
    )


def verify_secret(secret: str, digest: str) -> bool:
    try:
        algorithm, salt_b64, expected_b64 = digest.split("$", 2)
    except ValueError:
        return False
    if algorithm != "pbkdf2_sha256":
        return False
    salt = base64.urlsafe_b64decode(salt_b64.encode("ascii"))
    expected = base64.urlsafe_b64decode(expected_b64.encode("ascii"))
    actual = hashlib.pbkdf2_hmac("sha256", secret.encode("utf-8"), salt, 120_000)
    return hmac.compare_digest(actual, expected)

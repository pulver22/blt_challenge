from backend.security import generate_invite_code, hash_invite_code, verify_invite_code


def test_invite_codes_are_hashed_and_verifiable():
    code = generate_invite_code()
    digest = hash_invite_code(code)

    assert code not in digest
    assert verify_invite_code(code, digest)
    assert verify_invite_code(code.lower(), digest)
    assert not verify_invite_code("wrong-code", digest)

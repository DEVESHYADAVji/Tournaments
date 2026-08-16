from app.models.team import Team, TeamInvitation, TeamMember


def test_team_models_have_expected_table_names():
    assert Team.__tablename__ == "teams"
    assert TeamMember.__tablename__ == "team_members"
    assert TeamInvitation.__tablename__ == "team_invitations"

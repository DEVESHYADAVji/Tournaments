from datetime import datetime, timedelta
from typing import Literal, Optional

from fastapi import APIRouter, HTTPException, Request, status
from pydantic import BaseModel, ConfigDict, Field
from sqlalchemy import func, inspect, select, text

from app.core.database import async_session, engine
from app.models.announcement import Announcement
from app.models.auth_user import AuthUser
from app.models.match import Match
from app.models.tournament import Tournament
from app.models.tournament_registration import TournamentRegistration

router = APIRouter(prefix="/tournaments", tags=["tournaments"])


class TournamentOut(BaseModel):
    id: int
    name: str
    game: str
    format: str
    status: str
    location: Optional[str] = None
    description: Optional[str] = None
    start_date: Optional[datetime] = None
    end_date: Optional[datetime] = None
    prize_pool: int = 0
    max_teams: int = 16
    participants_count: int = 0
    matches_count: int = 0
    is_registered: bool = False
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)


class TournamentCreateIn(BaseModel):
    name: str = Field(min_length=2, max_length=255)
    game: str = Field(min_length=2, max_length=100)
    format: str = Field(default="Single Elimination", min_length=2, max_length=100)
    status: Literal["registration_open", "upcoming", "live", "completed"] = "registration_open"
    location: Optional[str] = Field(default=None, max_length=255)
    description: Optional[str] = None
    start_date: Optional[datetime] = None
    end_date: Optional[datetime] = None
    prize_pool: int = 0
    max_teams: int = 16


class JoinRequest(BaseModel):
    team_name: Optional[str] = Field(default=None, min_length=2, max_length=255)


class RegistrationOut(BaseModel):
    id: int
    tournament_id: int
    user_id: int
    team_name: str
    status: str
    points: int
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)


class JoinResponse(BaseModel):
    success: bool
    message: str
    registration: RegistrationOut


class MatchCreateIn(BaseModel):
    round_name: str = Field(default="Round 1", min_length=2, max_length=100)
    team_a: str = Field(min_length=2, max_length=255)
    team_b: str = Field(min_length=2, max_length=255)
    scheduled_at: Optional[datetime] = None


class MatchResultIn(BaseModel):
    team_a_score: int = Field(ge=0)
    team_b_score: int = Field(ge=0)
    winner: Optional[str] = None


class MatchOut(BaseModel):
    id: int
    tournament_id: int
    round_name: str
    team_a: str
    team_b: str
    scheduled_at: Optional[datetime] = None
    team_a_score: Optional[int] = None
    team_b_score: Optional[int] = None
    winner: Optional[str] = None
    status: str
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)


class StandingRow(BaseModel):
    rank: int
    user_id: int
    team_name: str
    points: int
    status: str


class AnnouncementCreateIn(BaseModel):
    title: str = Field(min_length=2, max_length=255)
    content: str = Field(min_length=2)


class AnnouncementOut(BaseModel):
    id: int
    tournament_id: int
    title: str
    content: str
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)


class MyRegistrationOut(BaseModel):
    registration_id: int
    tournament_id: int
    tournament_name: str
    game: str
    status: str
    team_name: str
    points: int
    start_date: Optional[datetime] = None


def _request_role(request: Request) -> str:
    return (request.headers.get("x-user-role") or "").strip().lower()


def _request_user_id(request: Request) -> Optional[int]:
    raw_user_id = request.headers.get("x-user-id")
    if not raw_user_id:
        return None
    try:
        return int(raw_user_id)
    except ValueError:
        return None


def _require_admin(request: Request) -> None:
    if _request_role(request) != "admin":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Admin role is required for this action",
        )


def _require_user_id(request: Request) -> int:
    user_id = _request_user_id(request)
    if user_id is None:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Missing user context. Please login again.",
        )
    return user_id


def _to_tournament_out(
    record: Tournament,
    participants_count: int,
    matches_count: int,
    is_registered: bool = False,
) -> TournamentOut:
    return TournamentOut(
        id=record.id,
        name=record.name,
        game=record.game,
        format=record.format,
        status=record.status,
        location=record.location,
        description=record.description,
        start_date=record.start_date,
        end_date=record.end_date,
        prize_pool=record.prize_pool,
        max_teams=record.max_teams,
        participants_count=participants_count,
        matches_count=matches_count,
        is_registered=is_registered,
        created_at=record.created_at,
    )


async def _get_tournament_or_404(tournament_id: int) -> Tournament:
    async with async_session() as session:
        result = await session.execute(select(Tournament).where(Tournament.id == tournament_id))
        tournament = result.scalar_one_or_none()
    if not tournament:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Tournament not found")
    return tournament


async def ensure_tournament_schema() -> None:
    """Upgrade legacy tournaments schema with additional columns used by the app."""

    def _sync_upgrade(sync_conn):
        inspector = inspect(sync_conn)
        if not inspector.has_table("tournaments"):
            return

        columns = {column["name"] for column in inspector.get_columns("tournaments")}
        indexes = {index["name"] for index in inspector.get_indexes("tournaments")}

        statements = [
            (
                "format",
                "ALTER TABLE tournaments ADD COLUMN `format` VARCHAR(100) NOT NULL DEFAULT 'Single Elimination'",
            ),
            (
                "location",
                "ALTER TABLE tournaments ADD COLUMN `location` VARCHAR(255) NULL",
            ),
            (
                "start_date",
                "ALTER TABLE tournaments ADD COLUMN `start_date` DATETIME NULL",
            ),
            (
                "end_date",
                "ALTER TABLE tournaments ADD COLUMN `end_date` DATETIME NULL",
            ),
            (
                "prize_pool",
                "ALTER TABLE tournaments ADD COLUMN `prize_pool` INTEGER NOT NULL DEFAULT 0",
            ),
            (
                "max_teams",
                "ALTER TABLE tournaments ADD COLUMN `max_teams` INTEGER NOT NULL DEFAULT 16",
            ),
            (
                "created_by_user_id",
                "ALTER TABLE tournaments ADD COLUMN `created_by_user_id` INTEGER NULL",
            ),
        ]

        for column_name, sql in statements:
            if column_name not in columns:
                sync_conn.execute(text(sql))

        if "ix_tournaments_created_by_user_id" not in indexes:
            sync_conn.execute(text("CREATE INDEX ix_tournaments_created_by_user_id ON tournaments (created_by_user_id)"))

    async with engine.begin() as conn:
        await conn.run_sync(_sync_upgrade)


async def seed_sample_tournaments() -> None:
    """Seed starter tournament data so the frontend has rich content out of the box."""
    await ensure_tournament_schema()

    async with async_session() as session:
        count = await session.scalar(select(func.count(Tournament.id)))
        if count and count > 0:
            return

        now = datetime.utcnow()
        items = [
            Tournament(
                name="Valor Clash Invitational",
                game="Valorant",
                format="Double Elimination",
                status="registration_open",
                location="Online",
                description="Regional invitational with live streams and playoffs.",
                start_date=now + timedelta(days=7),
                end_date=now + timedelta(days=11),
                prize_pool=25000,
                max_teams=16,
            ),
            Tournament(
                name="Apex Arena Masters",
                game="Apex Legends",
                format="League + Finals",
                status="upcoming",
                location="Los Angeles",
                description="Season-based points race ending in a LAN final.",
                start_date=now + timedelta(days=18),
                end_date=now + timedelta(days=21),
                prize_pool=50000,
                max_teams=20,
            ),
            Tournament(
                name="CS2 Night Cup",
                game="Counter-Strike 2",
                format="Single Elimination",
                status="live",
                location="Online",
                description="Fast weekly cup for rising teams and creators.",
                start_date=now - timedelta(days=1),
                end_date=now + timedelta(days=1),
                prize_pool=5000,
                max_teams=8,
            ),
        ]
        session.add_all(items)
        await session.flush()

        session.add_all(
            [
                Announcement(
                    tournament_id=items[0].id,
                    title="Registrations Open",
                    content="Check-in starts 30 minutes before qualifiers.",
                ),
                Announcement(
                    tournament_id=items[2].id,
                    title="Live Broadcast",
                    content="Main stage is streaming with caster desk analysis.",
                ),
                Match(
                    tournament_id=items[2].id,
                    round_name="Quarterfinals",
                    team_a="Nova Squad",
                    team_b="Iron Hawks",
                    status="scheduled",
                    scheduled_at=now + timedelta(hours=4),
                ),
                Match(
                    tournament_id=items[2].id,
                    round_name="Quarterfinals",
                    team_a="Pixel Storm",
                    team_b="Zenith Five",
                    status="scheduled",
                    scheduled_at=now + timedelta(hours=6),
                ),
            ]
        )

        await session.commit()


@router.get("/", response_model=list[TournamentOut])
async def list_tournaments(request: Request):
    user_id = _request_user_id(request)

    async with async_session() as session:
        tournaments = (
            await session.execute(
                select(Tournament).order_by(
                    Tournament.start_date.is_(None), Tournament.start_date.asc(), Tournament.created_at.desc()
                )
            )
        ).scalars().all()

        registration_rows = (
            await session.execute(
                select(TournamentRegistration.tournament_id, func.count(TournamentRegistration.id)).group_by(
                    TournamentRegistration.tournament_id
                )
            )
        ).all()
        match_rows = (
            await session.execute(select(Match.tournament_id, func.count(Match.id)).group_by(Match.tournament_id))
        ).all()

        registered_tournament_ids: set[int] = set()
        if user_id is not None:
            my_registrations = (
                await session.execute(
                    select(TournamentRegistration.tournament_id).where(TournamentRegistration.user_id == user_id)
                )
            ).scalars().all()
            registered_tournament_ids = set(my_registrations)

    participants_by_tournament = {tournament_id: count for tournament_id, count in registration_rows}
    matches_by_tournament = {tournament_id: count for tournament_id, count in match_rows}

    return [
        _to_tournament_out(
            item,
            participants_count=participants_by_tournament.get(item.id, 0),
            matches_count=matches_by_tournament.get(item.id, 0),
            is_registered=item.id in registered_tournament_ids,
        )
        for item in tournaments
    ]


@router.post("/", response_model=TournamentOut)
async def create_tournament(payload: TournamentCreateIn, request: Request):
    _require_admin(request)
    created_by_user_id = _request_user_id(request)

    if payload.end_date and payload.start_date and payload.end_date < payload.start_date:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="End date cannot be before start date")

    async with async_session() as session:
        tournament = Tournament(
            name=payload.name,
            game=payload.game,
            format=payload.format,
            status=payload.status,
            location=payload.location,
            description=payload.description,
            start_date=payload.start_date,
            end_date=payload.end_date,
            prize_pool=payload.prize_pool,
            max_teams=payload.max_teams,
            created_by_user_id=created_by_user_id,
        )
        session.add(tournament)
        await session.commit()
        await session.refresh(tournament)

    return _to_tournament_out(tournament, participants_count=0, matches_count=0, is_registered=False)


@router.get("/me/registrations", response_model=list[MyRegistrationOut])
async def get_my_registrations(request: Request):
    user_id = _require_user_id(request)

    async with async_session() as session:
        rows = (
            await session.execute(
                select(TournamentRegistration, Tournament)
                .join(Tournament, Tournament.id == TournamentRegistration.tournament_id)
                .where(TournamentRegistration.user_id == user_id)
                .order_by(TournamentRegistration.created_at.desc())
            )
        ).all()

    return [
        MyRegistrationOut(
            registration_id=registration.id,
            tournament_id=tournament.id,
            tournament_name=tournament.name,
            game=tournament.game,
            status=registration.status,
            team_name=registration.team_name,
            points=registration.points,
            start_date=tournament.start_date,
        )
        for registration, tournament in rows
    ]


@router.get("/{tournament_id}", response_model=TournamentOut)
async def get_tournament(tournament_id: int, request: Request):
    user_id = _request_user_id(request)
    async with async_session() as session:
        tournament = (
            await session.execute(select(Tournament).where(Tournament.id == tournament_id))
        ).scalar_one_or_none()
        if not tournament:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Tournament not found")

        participants_count = (
            await session.scalar(
                select(func.count(TournamentRegistration.id)).where(
                    TournamentRegistration.tournament_id == tournament_id
                )
            )
            or 0
        )
        matches_count = await session.scalar(select(func.count(Match.id)).where(Match.tournament_id == tournament_id)) or 0

        is_registered = False
        if user_id is not None:
            existing = (
                await session.execute(
                    select(TournamentRegistration.id).where(
                        TournamentRegistration.tournament_id == tournament_id,
                        TournamentRegistration.user_id == user_id,
                    )
                )
            ).scalar_one_or_none()
            is_registered = existing is not None

    return _to_tournament_out(
        tournament,
        participants_count=participants_count,
        matches_count=matches_count,
        is_registered=is_registered,
    )


@router.post("/{tournament_id}/join", response_model=JoinResponse)
async def join_tournament(tournament_id: int, payload: JoinRequest, request: Request):
    user_id = _require_user_id(request)
    if _request_role(request) != "user":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only users can join tournaments",
        )

    async with async_session() as session:
        tournament = (
            await session.execute(select(Tournament).where(Tournament.id == tournament_id))
        ).scalar_one_or_none()
        if not tournament:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Tournament not found")

        if tournament.status == "completed":
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Tournament is already completed")

        existing = (
            await session.execute(
                select(TournamentRegistration).where(
                    TournamentRegistration.tournament_id == tournament_id,
                    TournamentRegistration.user_id == user_id,
                )
            )
        ).scalar_one_or_none()
        if existing:
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="You are already registered")

        current_count = (
            await session.scalar(
                select(func.count(TournamentRegistration.id)).where(
                    TournamentRegistration.tournament_id == tournament_id
                )
            )
            or 0
        )
        if current_count >= tournament.max_teams:
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Tournament slots are full")

        auth_user = (
            await session.execute(select(AuthUser).where(AuthUser.id == user_id))
        ).scalar_one_or_none()
        default_team_name = auth_user.name if auth_user and auth_user.name else f"Team-{user_id}"
        registration = TournamentRegistration(
            tournament_id=tournament_id,
            user_id=user_id,
            team_name=payload.team_name or default_team_name,
            status="registered",
            points=0,
        )
        session.add(registration)
        await session.commit()
        await session.refresh(registration)

    return JoinResponse(success=True, message="Successfully joined tournament", registration=registration)


@router.get("/{tournament_id}/participants", response_model=list[RegistrationOut])
async def list_participants(tournament_id: int):
    await _get_tournament_or_404(tournament_id)
    async with async_session() as session:
        registrations = (
            await session.execute(
                select(TournamentRegistration)
                .where(TournamentRegistration.tournament_id == tournament_id)
                .order_by(TournamentRegistration.points.desc(), TournamentRegistration.created_at.asc())
            )
        ).scalars().all()
    return registrations


@router.get("/{tournament_id}/standings", response_model=list[StandingRow])
async def get_standings(tournament_id: int):
    await _get_tournament_or_404(tournament_id)
    async with async_session() as session:
        registrations = (
            await session.execute(
                select(TournamentRegistration)
                .where(TournamentRegistration.tournament_id == tournament_id)
                .order_by(TournamentRegistration.points.desc(), TournamentRegistration.created_at.asc())
            )
        ).scalars().all()

    return [
        StandingRow(
            rank=index + 1,
            user_id=item.user_id,
            team_name=item.team_name,
            points=item.points,
            status=item.status,
        )
        for index, item in enumerate(registrations)
    ]


@router.get("/{tournament_id}/matches", response_model=list[MatchOut])
async def list_matches(tournament_id: int):
    await _get_tournament_or_404(tournament_id)
    async with async_session() as session:
        matches = (
            await session.execute(
                select(Match)
                .where(Match.tournament_id == tournament_id)
                .order_by(Match.round_name.asc(), Match.created_at.asc())
            )
        ).scalars().all()
    return matches


@router.post("/{tournament_id}/matches", response_model=MatchOut)
async def create_match(tournament_id: int, payload: MatchCreateIn, request: Request):
    _require_admin(request)
    await _get_tournament_or_404(tournament_id)
    async with async_session() as session:
        match = Match(
            tournament_id=tournament_id,
            round_name=payload.round_name,
            team_a=payload.team_a,
            team_b=payload.team_b,
            scheduled_at=payload.scheduled_at,
            status="scheduled",
        )
        session.add(match)
        await session.commit()
        await session.refresh(match)
    return match


@router.patch("/{tournament_id}/matches/{match_id}/result", response_model=MatchOut)
async def update_match_result(
    tournament_id: int,
    match_id: int,
    payload: MatchResultIn,
    request: Request,
):
    _require_admin(request)
    await _get_tournament_or_404(tournament_id)

    async with async_session() as session:
        match = (
            await session.execute(
                select(Match).where(Match.tournament_id == tournament_id, Match.id == match_id)
            )
        ).scalar_one_or_none()
        if not match:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Match not found")

        winner = payload.winner
        if not winner:
            if payload.team_a_score > payload.team_b_score:
                winner = match.team_a
            elif payload.team_b_score > payload.team_a_score:
                winner = match.team_b

        match.team_a_score = payload.team_a_score
        match.team_b_score = payload.team_b_score
        match.winner = winner
        match.status = "finished"

        if winner:
            winner_registration = (
                await session.execute(
                    select(TournamentRegistration).where(
                        TournamentRegistration.tournament_id == tournament_id,
                        TournamentRegistration.team_name == winner,
                    )
                )
            ).scalar_one_or_none()
            if winner_registration:
                winner_registration.points += 3

        await session.commit()
        await session.refresh(match)

    return match


@router.get("/{tournament_id}/announcements", response_model=list[AnnouncementOut])
async def list_announcements(tournament_id: int):
    await _get_tournament_or_404(tournament_id)
    async with async_session() as session:
        announcements = (
            await session.execute(
                select(Announcement)
                .where(Announcement.tournament_id == tournament_id)
                .order_by(Announcement.created_at.desc())
            )
        ).scalars().all()
    return announcements


@router.post("/{tournament_id}/announcements", response_model=AnnouncementOut)
async def create_announcement(tournament_id: int, payload: AnnouncementCreateIn, request: Request):
    _require_admin(request)
    await _get_tournament_or_404(tournament_id)
    async with async_session() as session:
        announcement = Announcement(
            tournament_id=tournament_id,
            title=payload.title,
            content=payload.content,
        )
        session.add(announcement)
        await session.commit()
        await session.refresh(announcement)
    return announcement

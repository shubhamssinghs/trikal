"""Seed runner — checks seeds_log table and applies only new seeds."""
import importlib
import os
from datetime import datetime, timezone

from sqlalchemy import text
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import AsyncSessionLocal
from app.utils.logger import get_logger, setup_logger

setup_logger()
logger = get_logger()

SEEDS_LOG_TABLE = "seeds_log"
SEEDS_DATA_DIR = os.path.join(os.path.dirname(__file__), "data")


async def ensure_seeds_log_table(session: AsyncSession):
    await session.execute(
        text(
            f"""
            CREATE TABLE IF NOT EXISTS {SEEDS_LOG_TABLE} (
                id SERIAL PRIMARY KEY,
                seed_name VARCHAR UNIQUE NOT NULL,
                applied_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
            )
            """
        )
    )
    await session.commit()


async def get_applied_seeds(session: AsyncSession) -> set[str]:
    result = await session.execute(
        text(f"SELECT seed_name FROM {SEEDS_LOG_TABLE}")
    )
    return {row[0] for row in result.fetchall()}


async def mark_seed_applied(session: AsyncSession, seed_name: str):
    await session.execute(
        text(f"INSERT INTO {SEEDS_LOG_TABLE} (seed_name) VALUES (:name)"),
        {"name": seed_name},
    )
    await session.commit()


async def run_seeds():
    async with AsyncSessionLocal() as session:
        await ensure_seeds_log_table(session)
        applied = await get_applied_seeds(session)

        seed_files = sorted(
            f for f in os.listdir(SEEDS_DATA_DIR) if f.endswith(".py")
        )

        for seed_file in seed_files:
            seed_name = seed_file.replace(".py", "")
            if seed_name in applied:
                logger.info(f"Seed '{seed_name}' already applied — skipping")
                continue

            logger.info(f"Applying seed: {seed_name}")
            module = importlib.import_module(f"seeds.data.{seed_name}")
            await module.apply(session)
            await mark_seed_applied(session, seed_name)
            logger.info(f"Seed '{seed_name}' applied successfully")


if __name__ == "__main__":
    import asyncio
    asyncio.run(run_seeds())

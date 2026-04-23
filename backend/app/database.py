from sqlalchemy.ext.asyncio import create_async_engine, AsyncSession, async_sessionmaker
from sqlalchemy.orm import DeclarativeBase
from .config import settings

# Neon async connection pool settings
engine = create_async_engine(
    settings.DATABASE_URL,
    pool_size=5,           # Neon free tier connection limit
    max_overflow=10,
    pool_pre_ping=True,    # Test connections before use
    pool_recycle=300,      # Recycle connections every 5 min
)

AsyncSessionLocal = async_sessionmaker(
    bind=engine,
    class_=AsyncSession,
    expire_on_commit=False,
)

class Base(DeclarativeBase):
    pass

async def get_db():
    async with AsyncSessionLocal() as session:
        try:
            yield session
            await session.commit()
        except Exception:
            await session.rollback()
            raise
        finally:
            await session.close()

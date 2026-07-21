from app.database import engine, Base
from app.models import campaign, credential, event, user, organization

Base.metadata.drop_all(bind=engine)
Base.metadata.create_all(bind=engine)
print("Database reset successfully.")

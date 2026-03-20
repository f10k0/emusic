from database import engine
from models import Base

print("Создание таблиц в базе данных...")
Base.metadata.create_all(bind=engine)
print("Таблицы успешно созданы!")
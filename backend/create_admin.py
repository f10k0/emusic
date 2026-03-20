from database import SessionLocal
from models import User
import auth

def create_admin():
    db = SessionLocal()
    try:
        # Проверяем, нет ли уже такого админа
        existing = db.query(User).filter(User.username == "adminrule01").first()
        if existing:
            print("Администратор с таким именем уже существует!")
            return
        
        # Создаём нового админа
        hashed = auth.get_password_hash("3270125")
        admin = User(
            username="adminrule01",
            email="admin@emusic.com",
            hashed_password=hashed,
            role="admin",
            is_active=True
        )
        db.add(admin)
        db.commit()
        print("Администратор успешно создан!")
        print("Логин: adminrule01")
        print("Пароль: 3270125")
        
    except Exception as e:
        print(f"Ошибка: {e}")
        db.rollback()
    finally:
        db.close()

if __name__ == "__main__":
    create_admin()
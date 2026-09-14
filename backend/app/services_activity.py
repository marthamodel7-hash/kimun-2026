from sqlalchemy.orm import Session
from app import models


def emit(db: Session, actor: str, action: str, entity_type: str = "", entity_id: int = 0, message: str = ""):
    ev = models.ActivityEvent(actor=actor, action=action, entity_type=entity_type, entity_id=entity_id, message=message)
    db.add(ev)
    db.commit()
    return ev


def notify(db: Session, user_email: str, message: str, link: str = "", type: str = "info"):
    n = models.Notification(user_email=user_email, message=message, link=link, type=type)
    db.add(n)
    db.commit()
    return n

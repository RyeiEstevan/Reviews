from pydantic import BaseModel


class PostCreate(BaseModel):
    title: str = ""
    content: str = ""
    category: str = ""


class CommentCreate(BaseModel):
    content: str = ""

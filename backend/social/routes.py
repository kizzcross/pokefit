from .views import FriendViewSet, TimelineViewSet


routes = [
    {"regex": r"friends", "viewset": FriendViewSet, "basename": "friend"},
    {"regex": r"timeline", "viewset": TimelineViewSet, "basename": "timeline"},
]

from locust import HttpUser, task, between, SequentialTaskSet
import random


class UserBehavior(SequentialTaskSet):
    """Simulate realistic user behavior"""

    def on_start(self):
        """Login on start"""
        # For load testing, use pre-created test credentials
        response = self.client.post("/api/token/", json={
            "email": "loadtest@example.com",
            "password": "loadtest123"
        })

        if response.status_code == 200:
            data = response.json()
            self.token = data.get('access') or data.get('token')
            self.headers = {"Authorization": f"Bearer {self.token}"}
        else:
            self.token = None
            self.headers = {}

    @task(1)
    def list_notes(self):
        """List notes (common action)"""
        if self.token:
            self.client.get("/api/notes/", headers=self.headers)

    @task(2)
    def view_note(self):
        """View random note"""
        if self.token:
            note_id = random.randint(1, 100)
            self.client.get(f"/api/notes/{note_id}/", headers=self.headers)

    @task(1)
    def list_ai_outputs(self):
        """List AI outputs"""
        if self.token:
            self.client.get("/api/ai-tools/outputs/", headers=self.headers)

    @task(1)
    def check_quota(self):
        """Check AI tool quota"""
        if self.token:
            self.client.get("/api/ai-tools/quota/", headers=self.headers)


class WebsiteUser(HttpUser):
    """Load test user"""
    tasks = [UserBehavior]
    wait_time = between(1, 3)


# Run with:
# locust -f tests/load/locustfile.py --host=http://localhost:8000
# Then open http://localhost:8089
#
# Target: 10,000 concurrent users
# Expected: p95 response time < 200ms

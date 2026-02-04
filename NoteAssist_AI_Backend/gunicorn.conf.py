import multiprocessing
import os

# Server socket
bind = f"0.0.0.0:{os.getenv('PORT', '8000')}"
backlog = 2048

# Worker processes
workers = multiprocessing.cpu_count() * 2 + 1
worker_class = 'gthread'
threads = 4
worker_connections = 1000
max_requests = 1000
max_requests_jitter = 50
timeout = 120
keepalive = 5
graceful_timeout = 30

# Logging
accesslog = '/var/log/studynotes/gunicorn-access.log'
errorlog = '/var/log/studynotes/gunicorn-error.log'
loglevel = 'info'
access_log_format = '%(h)s %(l)s %(u)s %(t)s "%(r)s" %(s)s %(b)s "%(f)s" "%(a)s" %(D)s'

# Process naming
proc_name = 'studynotes_gunicorn'

# Server mechanics
daemon = False
pidfile = '/var/run/studynotes/gunicorn.pid'
user = 'www-data'
group = 'www-data'
tmp_upload_dir = None

# Performance
worker_tmp_dir = '/dev/shm'


def on_starting(server):
    """Called before master process is initialized"""
    print("Gunicorn master starting")


def on_reload(server):
    """Called to recycle workers during a reload via SIGHUP"""
    print("Gunicorn reloading")


def when_ready(server):
    """Called after workers are started"""
    print("Gunicorn ready. Workers spawned")


def on_exit(server):
    """Called before master process exits"""
    print("Gunicorn master exiting")

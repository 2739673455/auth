.PHONY: help install install_test init_db run test test_auth test_admin clean

help:
	@echo "make install      	- 安装依赖"
	@echo "make install_test 	- 安装测试依赖"
	@echo "make init_db      	- 初始化数据库"
	@echo "make run          	- 启动服务"
	@echo "make test         	- 运行测试"
	@echo "make test_auth    	- 运行认证测试"
	@echo "make test_admin   	- 运行管理员测试"
	@echo "make clean        	- 清理临时文件"

install:
	uv sync

install_test:
	uv sync --group test

init_db:
	uv run -m app._init_db

run:
	uv run -m app.main

test:
	uv run pytest

test_auth:
	uv run pytest tests/test_auth.py -v

test_admin:
	uv run pytest tests/test_admin.py -v

clean:
	find . -type d -name "__pycache__" -exec rm -rf {} + 2>/dev/null || true
	find . -type d -name ".pytest_cache" -exec rm -rf {} + 2>/dev/null || true
	find . -type d -name ".venv" -exec rm -rf {} + 2>/dev/null || true
	find . -type d -name "logs" -exec rm -rf {} + 2>/dev/null || true
	find . -name "*.pyc" -delete 2>/dev/null || true
	find . -name ".coverage" -delete 2>/dev/null || true

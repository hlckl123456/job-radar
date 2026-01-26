# Contributing to AI Memory System

Thank you for your interest in contributing! This document provides guidelines for contributing to the project.

## 🌟 Ways to Contribute

### 1. Report Bugs 🐛

Found a bug? Please [open an issue](../../issues/new?template=bug_report.md) with:
- Clear title describing the problem
- Steps to reproduce
- Expected vs actual behavior
- Your environment (Python version, OS, etc.)
- Error messages or logs

### 2. Suggest Features 💡

Have an idea? [Open a feature request](../../issues/new?template=feature_request.md) with:
- Clear description of the feature
- Use case and benefits
- Proposed implementation (if you have ideas)
- Examples from other projects (optional)

### 3. Improve Documentation 📖

Documentation improvements are always welcome:
- Fix typos or unclear explanations
- Add more examples
- Improve code comments
- Translate documentation to other languages

### 4. Submit Code 💻

See the "Development Workflow" section below.

---

## 🚀 Development Workflow

### 1. Fork and Clone

```bash
# Fork the repository on GitHub, then:
git clone https://github.com/YOUR_USERNAME/memory-system.git
cd memory-system
```

### 2. Create a Branch

```bash
git checkout -b feature/your-feature-name
# or
git checkout -b fix/your-bug-fix
```

Branch naming conventions:
- `feature/` - New features
- `fix/` - Bug fixes
- `docs/` - Documentation changes
- `test/` - Test improvements
- `refactor/` - Code refactoring

### 3. Set Up Development Environment

```bash
# Create virtual environment
python3 -m venv .venv
source .venv/bin/activate  # On Windows: .venv\Scripts\activate

# Install dependencies
pip install -r requirements.txt

# Install development dependencies
pip install pytest pytest-cov black flake8 mypy
```

### 4. Configure API Keys

```bash
# Add to ~/.zshrc or ~/.bashrc
export OPENAI_API_KEY="sk-proj-your-key"
export MEM0_API_KEY="m0-your-key"

# Reload
source ~/.zshrc  # or source ~/.bashrc
```

### 5. Make Changes

#### Code Style

We follow Python best practices:

**Formatting:**
```bash
# Format code with black
black src/ tests/

# Check with flake8
flake8 src/ tests/ --max-line-length=100
```

**Type Hints:**
```python
# Good
def add_memory(content: str, memory_type: str, importance: str = "medium") -> dict:
    return {"content": content, "type": memory_type}

# Avoid
def add_memory(content, memory_type, importance="medium"):
    return {"content": content, "type": memory_type}
```

**Documentation:**
```python
def search_memories(query: str, top_k: int = 5) -> List[dict]:
    """
    Search for relevant memories using semantic search.

    Args:
        query: Search query text
        top_k: Number of results to return

    Returns:
        List of memory dictionaries with relevance scores
    """
    pass
```

### 6. Write Tests

All new features must include tests:

```bash
# Run tests
pytest tests/ -v

# With coverage
pytest tests/ --cov=src --cov-report=html

# Specific test
pytest tests/test_memory.py::TestMemoryManager::test_add_memory -v
```

**Test structure:**
```python
# tests/test_your_feature.py
import pytest
from src.your_module import your_function

def test_your_function():
    """Test that your_function works correctly"""
    result = your_function("input")
    assert result == "expected_output"

def test_your_function_error_handling():
    """Test error handling"""
    with pytest.raises(ValueError):
        your_function(invalid_input)
```

### 7. Commit Changes

Follow [Conventional Commits](https://www.conventionalcommits.org/):

```bash
# Format: <type>(<scope>): <description>

git commit -m "feat(memory): add memory decay feature"
git commit -m "fix(assistant): correct context building bug"
git commit -m "docs(readme): add usage examples"
git commit -m "test(memory): add integration tests"
```

**Commit types:**
- `feat`: New feature
- `fix`: Bug fix
- `docs`: Documentation changes
- `test`: Test additions/changes
- `refactor`: Code refactoring
- `style`: Formatting changes
- `chore`: Build/config changes

### 8. Push and Create Pull Request

```bash
git push origin feature/your-feature-name
```

Then create a PR on GitHub with:
- Clear title following conventional commits
- Description of changes
- Related issue number (if applicable)
- Screenshots (if UI changes)
- Test results

---

## 📋 Pull Request Checklist

Before submitting, ensure:

- [ ] Code follows project style guidelines
- [ ] All tests pass (`pytest tests/ -v`)
- [ ] New tests added for new features
- [ ] Documentation updated (README, docstrings)
- [ ] Commit messages follow conventional commits
- [ ] Branch is up to date with main
- [ ] No merge conflicts

---

## 🔍 Code Review Process

1. **Automated Checks**: CI runs tests and linters
2. **Maintainer Review**: We'll review your code and provide feedback
3. **Address Feedback**: Make requested changes
4. **Approval**: Once approved, we'll merge your PR
5. **Celebration**: Your contribution is live! 🎉

---

## 🎯 Areas We Need Help

High-priority contributions:

### Features
- [ ] REST API implementation
- [ ] Web dashboard UI
- [ ] Memory visualization
- [ ] Knowledge graph construction
- [ ] Multi-modal memory (images, docs)
- [ ] LLM-based importance assessment
- [ ] Memory decay/expiration

### Documentation
- [ ] Video tutorials
- [ ] More code examples
- [ ] Translations (Spanish, French, German, etc.)
- [ ] Best practices guide
- [ ] Troubleshooting guide
- [ ] API reference documentation

### Testing
- [ ] Increase test coverage
- [ ] Performance benchmarks
- [ ] Integration tests for Mem0
- [ ] Load testing

### Infrastructure
- [ ] Docker support
- [ ] CI/CD improvements
- [ ] Automated releases
- [ ] Monitoring and logging

---

## 💬 Questions?

- 📖 Check the [documentation](./README.md)
- 💭 Ask in [GitHub Discussions](../../discussions)
- 🐛 Search [existing issues](../../issues)

---

## 📜 Code of Conduct

### Our Pledge

We are committed to providing a welcoming and inclusive environment for everyone.

### Our Standards

**Positive behavior:**
- Being respectful and considerate
- Providing constructive feedback
- Accepting criticism gracefully
- Focusing on what's best for the community

**Unacceptable behavior:**
- Harassment or discriminatory language
- Personal attacks
- Publishing private information
- Spam or off-topic content

### Enforcement

Violations may result in:
1. Warning
2. Temporary ban
3. Permanent ban

Report issues to project maintainers.

---

## 🎁 Recognition

Contributors will be:
- Listed in the README
- Credited in release notes
- Mentioned in the CHANGELOG
- Given our eternal gratitude! 🙏

---

## 🙏 Thank You!

Every contribution, no matter how small, makes this project better. We appreciate your time and effort!

---

**Happy Contributing! 🚀**

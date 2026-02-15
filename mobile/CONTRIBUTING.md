# Contributing to AIFace

Thank you for your interest in the AIFace project! We welcome any contribution to the development of this application.

## 📋 Table of Contents

1. [Code of Conduct](#code-of-conduct)
2. [How to Contribute](#how-to-contribute)
3. [Development Process](#development-process)
4. [Code Style](#code-style)
5. [Testing](#testing)
6. [Documentation](#documentation)
7. [Commits](#commits)
8. [Pull Requests](#pull-requests)

---

## Code of Conduct

By participating in this project, you agree to abide by the following principles:

- Be respectful to other participants
- Accept constructive criticism
- Focus on what is best for the community
- Show empathy towards other members

---

## How to Contribute

### Report a Bug

If you find a bug:

1. Check if an [issue](https://github.com/yourusername/AIFace/issues) has already been created for this problem
2. If not, create a new issue using the Bug Report template
3. Describe the problem in as much detail as possible:
   - Steps to reproduce
   - Expected behavior
   - Actual behavior
   - Screenshots (if applicable)
   - App version
   - Platform (Android/iOS)
   - OS version

### Request a Feature

Have an idea for improvement?

1. Check [existing issues](https://github.com/yourusername/AIFace/issues)
2. Create an issue using the Feature Request template
3. Describe:
   - The problem the feature solves
   - Proposed solution
   - Alternatives considered
   - Additional context

### Write Code

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Write tests
5. Update documentation
6. Create a Pull Request

---

## Development Process

### Environment Setup

1. **Clone your fork**
   ```bash
   git clone https://github.com/YOUR_USERNAME/AIFace.git
   cd AIFace
   ```

2. **Add upstream remote**
   ```bash
   git remote add upstream https://github.com/yourusername/AIFace.git
   ```

3. **Install dependencies**
   ```bash
   ./gradlew build
   ```

4. **Setup API keys**
   - See [BUILD_GUIDE.md](docs/BUILD_GUIDE.md)

### Branch Strategy

We use GitHub Flow:

- `main` - stable version, always ready for release
- `feature/*` - new features
- `bugfix/*` - bug fixes
- `hotfix/*` - urgent production fixes
- `refactor/*` - code refactoring
- `docs/*` - documentation changes

**Example**:
```bash
git checkout -b feature/add-dark-theme
git checkout -b bugfix/fix-recipe-image-loading
```

### Workflow

1. **Sync with upstream**
   ```bash
   git fetch upstream
   git rebase upstream/main
   ```

2. **Create a branch**
   ```bash
   git checkout -b feature/your-feature-name
   ```

3. **Make changes**
   ```bash
   # Edit code
   git add .
   git commit -m "feat: add dark theme support"
   ```

4. **Push changes**
   ```bash
   git push origin feature/your-feature-name
   ```

5. **Create a Pull Request**

---

## Code Style

### Kotlin

Follow [Kotlin Coding Conventions](https://kotlinlang.org/docs/coding-conventions.html):

```kotlin
// ✅ Good
class UserRepository(
    private val userDao: UserDao,
    private val apiService: ApiService
) {
    suspend fun getUser(id: String): Result<User> {
        return try {
            val user = userDao.getUserById(id)
            Result.Success(user)
        } catch (e: Exception) {
            Result.Error(e)
        }
    }
}

// ❌ Bad
class UserRepository(private val userDao:UserDao,private val apiService:ApiService){
    suspend fun getUser(id:String):Result<User>{
        try{
            val user=userDao.getUserById(id)
            return Result.Success(user)
        }catch(e:Exception){
            return Result.Error(e)
        }
    }
}
```

### Compose

```kotlin
// ✅ Good
@Composable
fun RecipeCard(
    recipe: Recipe,
    onRecipeClick: (String) -> Unit,
    modifier: Modifier = Modifier
) {
    Card(
        modifier = modifier
            .fillMaxWidth()
            .clickable { onRecipeClick(recipe.id) },
        elevation = CardDefaults.cardElevation(defaultElevation = 4.dp)
    ) {
        Column(modifier = Modifier.padding(16.dp)) {
            Text(
                text = recipe.title,
                style = MaterialTheme.typography.headlineSmall
            )
            Spacer(modifier = Modifier.height(8.dp))
            Text(
                text = recipe.description,
                style = MaterialTheme.typography.bodyMedium
            )
        }
    }
}

// ❌ Bad
@Composable fun RecipeCard(recipe:Recipe,onRecipeClick:(String)->Unit){
    Card(modifier=Modifier.fillMaxWidth().clickable{onRecipeClick(recipe.id)}){
        Column{
            Text(recipe.title)
            Text(recipe.description)
        }
    }
}
```

### Naming Conventions

- **Classes**: `PascalCase` - `UserRepository`, `RecipeViewModel`
- **Functions**: `camelCase` - `getUserById`, `loadRecipes`
- **Variables**: `camelCase` - `userId`, `recipeList`
- **Constants**: `SCREAMING_SNAKE_CASE` - `MAX_RETRY_COUNT`, `API_BASE_URL`
- **Composables**: `PascalCase` - `RecipeCard`, `HomeScreen`

### File Structure

```kotlin
// Imports grouped and sorted
import androidx.compose.foundation.layout.*
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.navigation.NavHostController
import com.aiface.shared.domain.model.Recipe
import org.koin.compose.koinInject

// Class/Function implementation
@Composable
fun HomeScreen(
    navController: NavHostController,
    viewModel: HomeViewModel = koinInject()
) {
    // Implementation
}
```

### Comments

```kotlin
// ✅ Good - Explains "why"
// Using exponential backoff to prevent API rate limiting
val retryDelay = baseDelay * (2.0.pow(retryCount)).toLong()

// ❌ Bad - Explains "what" (obvious from code)
// Set retry delay to base delay times 2 to the power of retry count
val retryDelay = baseDelay * (2.0.pow(retryCount)).toLong()
```

---

## Testing

### Unit Tests

All use cases and ViewModels should have tests:

```kotlin
class GetRecipesUseCaseTest {
    
    private lateinit var useCase: GetRecipesUseCase
    private lateinit var mockRepository: RecipeRepository
    
    @Before
    fun setup() {
        mockRepository = mockk()
        useCase = GetRecipesUseCase(mockRepository)
    }
    
    @Test
    fun `should return recipes on success`() = runTest {
        // Given
        val expectedRecipes = listOf(
            Recipe(id = "1", title = "Test Recipe", /* ... */)
        )
        coEvery { mockRepository.getRecipes(any()) } returns flowOf(expectedRecipes)
        
        // When
        val result = useCase.invoke("session_id")
        
        // Then
        result.collect { recipes ->
            assertEquals(expectedRecipes, recipes)
        }
    }
    
    @Test
    fun `should handle error`() = runTest {
        // Given
        coEvery { mockRepository.getRecipes(any()) } throws Exception("Network error")
        
        // When & Then
        assertFailsWith<Exception> {
            useCase.invoke("session_id").collect()
        }
    }
}
```

### Running Tests

```bash
# All tests
./gradlew test

# Specific module
./gradlew :shared:test

# Android instrumented tests
./gradlew connectedAndroidTest

# With coverage
./gradlew testDebugUnitTest jacocoTestReport
```

### Test Coverage

- Minimum coverage: **70%**
- Use cases: **90%+**
- ViewModels: **80%+**
- Repositories: **75%+**

---

## Documentation

### Code Documentation

Use KDoc for public API:

```kotlin
/**
 * Retrieves recipes based on recognized products and user preferences.
 *
 * @param products List of recognized products from the fridge
 * @param preferences User's dietary preferences and constraints
 * @return Result containing list of suggested recipes or error
 * @throws NetworkException if API call fails
 */
suspend fun suggestRecipes(
    products: List<RecognizedProduct>,
    preferences: UserPreferences
): Result<List<Recipe>>
```

### README Updates

When adding a new feature, update:
- README.md
- CHANGELOG.md
- Relevant section in docs/

---

## Commits

### Conventional Commits

Use [Conventional Commits](https://www.conventionalcommits.org/):

```
<type>(<scope>): <subject>

<body>

<footer>
```

#### Types

- `feat`: New functionality
- `fix`: Bug fix
- `docs`: Documentation changes
- `style`: Formatting, white-space (no code change)
- `refactor`: Refactoring (no features or bug fixes)
- `test`: Adding or fixing tests
- `chore`: Dependency updates, config changes

#### Examples

```bash
feat(recognition): add confidence threshold filtering
fix(database): resolve migration crash on iOS
docs(readme): add installation instructions
style(compose): format HomeScreen with ktlint
refactor(repository): simplify error handling
test(usecase): add tests for GetRecipesUseCase
chore(deps): update Kotlin to 1.9.23
```

#### Scope

- `recognition` - Product recognition
- `recipes` - Recipe generation and management
- `preferences` - User preferences
- `database` - Database related
- `network` - API and networking
- `ui` - User interface
- `navigation` - Navigation
- `camera` - Camera functionality

---

## Pull Requests

### Before Submitting

- [ ] Code follows style guidelines
- [ ] All tests pass
- [ ] New tests added for new features
- [ ] Documentation updated
- [ ] No merge conflicts with `main`
- [ ] Commits follow Conventional Commits
- [ ] PR description is clear

### PR Template

```markdown
## Description
Brief description of changes

## Type of Change
- [ ] Bug fix
- [ ] New feature
- [ ] Breaking change
- [ ] Documentation update

## How Has This Been Tested?
Describe the tests you ran

## Checklist:
- [ ] My code follows the style guidelines
- [ ] I have performed a self-review
- [ ] I have commented my code where needed
- [ ] I have updated the documentation
- [ ] My changes generate no new warnings
- [ ] I have added tests
- [ ] All tests pass locally
```

### Review Process

1. **Automated checks** - CI/CD must pass
2. **Code review** - Minimum 1 approving review
3. **Testing** - Reviewer verifies functionality
4. **Merge** - Squash and merge into `main`

---

## Priorities

### High Priority
- Bug fixes
- Security issues
- Performance improvements

### Medium Priority
- New features
- UI/UX improvements
- Documentation

### Low Priority
- Code refactoring
- Minor optimizations
- Nice-to-have features

---

## Getting Help

Need help?

- 💬 [GitHub Discussions](https://github.com/yourusername/AIFace/discussions)
- 🐛 [GitHub Issues](https://github.com/yourusername/AIFace/issues)
- 📧 Email: dev@aiface.app
- 📚 [Documentation](docs/)

---

## License

By contributing, you agree that your contributions will be licensed under the [MIT License](LICENSE).

---

**Thanks for contributing to AIFace! 🎉**

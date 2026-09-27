// Authored examples. Add a page only after checking the examples and references.
export const studyNotes = [
  {
    slug: 'python-functions-beginner-notes',
    publishedAt: '2026-09-27',
    title: 'Python Functions: Notes, Examples and Practice',
    description: 'Learn parameters, return values and default arguments through a study tracker example, then solve two short Python tasks.',
    excerpt: 'A practical explanation of functions using a daily study tracker.',
    category: 'Python',
    readingMinutes: 3,
    body: `
      <p>A function gives a named task its own place in your program. You define it once with <code>def</code>, then call it whenever you need that task. Start by deciding what information the function needs and what answer it should return.</p>
      <h2>Parameters and arguments</h2>
      <p>A parameter is a name in the definition. An argument is the value passed at the call site. In this example <code>minutes</code> is a parameter; <code>45</code> is an argument. The function returns a result that another part of the program can use.</p>
      <pre><code>def hours_studied(minutes):
    return minutes / 60

today_hours = hours_studied(45)
print(today_hours)  # 0.75</code></pre>
      <p>A function without an explicit <code>return</code> returns <code>None</code>. Printing inside a function is useful for displaying a result, while returning a value lets you calculate with it later.</p>
      <h2>Default arguments</h2>
      <p>Defaults let a caller omit a value when there is a sensible usual choice. Put parameters with defaults after required parameters. Prefer immutable defaults such as a string or number. A mutable default list can be shared between calls.</p>
      <pre><code>def study_message(topic, minutes=30):
    return f"Study {topic} for {minutes} minutes"

print(study_message("functions"))
print(study_message("SQL joins", 45))</code></pre>
      <h2>Worked example: daily study total</h2>
      <p>Imagine a learner records three sessions. A small function makes the conversion rule reusable and easy to check.</p>
      <pre><code>def total_study_hours(sessions):
    total_minutes = sum(sessions)
    return round(total_minutes / 60, 2)

print(total_study_hours([25, 35, 40]))  # 1.67</code></pre>
      <p>The list is supplied by the caller. <code>sum</code> adds its minutes, and <code>round</code> formats the returned number to two decimal places. An empty list returns <code>0.0</code>.</p>
      <h2>Practice before checking the answer</h2>
      <ol>
        <li>Write <code>minutes_left(goal, done)</code>. Return zero if the goal is already met; otherwise return the remaining minutes.</li>
        <li>Write <code>passed_quiz(score, pass_mark=60)</code>. Return <code>True</code> when the score meets or exceeds the pass mark.</li>
      </ol>
      <details><summary>Show one possible solution</summary><pre><code>def minutes_left(goal, done):
    return max(0, goal - done)

def passed_quiz(score, pass_mark=60):
    return score >= pass_mark

assert minutes_left(90, 30) == 60
assert minutes_left(30, 90) == 0
assert passed_quiz(60) is True
assert passed_quiz(60, 70) is False</code></pre></details>
      <h2>Quick review</h2>
      <ul><li>What is the difference between a parameter and an argument?</li><li>Why is <code>return</code> more useful than <code>print</code> for a result you will reuse?</li><li>What does <code>minutes_left(30, 50)</code> return?</li></ul>
      <p><strong>Reference:</strong> <a href="https://docs.python.org/3/tutorial/controlflow.html#defining-functions">Python tutorial: defining functions</a>.</p>
    `
  },
  {
    slug: 'django-querysets-study-notes',
    publishedAt: '2026-09-27',
    title: 'Django QuerySets: Filter, Fetch and Avoid Extra Queries',
    description: 'Free Django ORM notes with a study app example, lazy QuerySets, select_related, prefetch_related and two practice questions.',
    excerpt: 'Understand when a QuerySet runs and how related objects affect query count.',
    category: 'Django',
    readingMinutes: 3,
    body: `
      <p>A Django <code>QuerySet</code> represents a database query and the collection of objects it can return. Building one does not usually send the query immediately. Iterating it, converting it to a list or otherwise evaluating it fetches data.</p>
      <h2>Filter a useful subset</h2>
      <p>Suppose your app has a <code>Note</code> model with a title, owner and creation date. The first line builds a query; the loop evaluates it and displays matching notes.</p>
      <pre><code>recent = Note.objects.filter(user=request.user).order_by("-created_at")[:10]

for note in recent:
    print(note.title)</code></pre>
      <p>Filtering by the authenticated user also matters for privacy. Never trust a note ID alone to grant access to another learner's note.</p>
      <h2>Related objects and query count</h2>
      <p>When each note has a foreign key to an author, reading <code>note.user.email</code> in a loop can fetch a user repeatedly. <code>select_related</code> joins single-valued relationships in the main query. For a many-to-many or reverse relationship such as chapters, <code>prefetch_related</code> fetches related records separately and connects them in Python.</p>
      <pre><code>notes = (
    Note.objects
    .filter(status="published")
    .select_related("user")
    .prefetch_related("chapters")
)

for note in notes:
    print(note.title, note.user.email, len(note.chapters.all()))</code></pre>
      <p>The correct optimization depends on which related fields the page actually uses. Confirm with query-count tests rather than assuming every prefetch helps.</p>
      <h2>Worked check</h2>
      <p>For a learner's latest five notes, build a queryset and then inspect its results. Keep authorization in the filter:</p>
      <pre><code>latest = Note.objects.filter(user=request.user).order_by("-created_at")[:5]
titles = [note.title for note in latest]</code></pre>
      <h2>Practice before checking the answer</h2>
      <ol><li>Build a queryset for the current user's notes with status <code>published</code>, newest first.</li><li>If a list page displays each note's <code>user.email</code> and its chapters, which two related-object methods would you consider?</li></ol>
      <details><summary>Show one possible solution</summary><pre><code>notes = (
    Note.objects
    .filter(user=request.user, status="published")
    .select_related("user")
    .prefetch_related("chapters")
    .order_by("-created_at")
)</code></pre><p>Measure query count with representative data before and after changing a real view.</p></details>
      <h2>Quick review</h2><ul><li>When is a QuerySet evaluated?</li><li>Which relationship type fits <code>select_related</code>?</li><li>Why must a private notes query include its owner?</li></ul>
      <p><strong>Reference:</strong> <a href="https://docs.djangoproject.com/en/5.2/ref/models/querysets/">Django QuerySet API</a>.</p>
    `
  },
  {
    slug: 'sql-joins-practice-notes',
    publishedAt: '2026-09-27',
    title: 'SQL Joins: INNER JOIN and LEFT JOIN with Practice',
    description: 'Free SQL joins notes using students and study sessions, with sample data, expected results and a practice challenge.',
    excerpt: 'See why an INNER JOIN omits unmatched rows and a LEFT JOIN keeps them.',
    category: 'SQL',
    readingMinutes: 3,
    body: `
      <p>Use a join when information lives in more than one table. Imagine a <code>students</code> table with names and a <code>sessions</code> table with completed study minutes. The common key is <code>students.id = sessions.student_id</code>.</p>
      <h2>Start with a small dataset</h2>
      <table><thead><tr><th>students.id</th><th>name</th></tr></thead><tbody><tr><td>1</td><td>Amina</td></tr><tr><td>2</td><td>Bilal</td></tr><tr><td>3</td><td>Chen</td></tr></tbody></table>
      <table><thead><tr><th>sessions.student_id</th><th>minutes</th></tr></thead><tbody><tr><td>1</td><td>30</td></tr><tr><td>1</td><td>45</td></tr><tr><td>2</td><td>20</td></tr></tbody></table>
      <h2>INNER JOIN: show matching records</h2>
      <pre><code>SELECT students.name, sessions.minutes
FROM students
INNER JOIN sessions ON sessions.student_id = students.id
ORDER BY students.id, sessions.minutes;</code></pre>
      <p>Result: Amina appears twice (30 and 45), Bilal once (20), and Chen does not appear because Chen has no session. A join can return more than one row for the same student.</p>
      <h2>LEFT JOIN: keep every student</h2>
      <pre><code>SELECT students.name, sessions.minutes
FROM students
LEFT JOIN sessions ON sessions.student_id = students.id
ORDER BY students.id, sessions.minutes;</code></pre>
      <p>Chen now appears with <code>NULL</code> minutes. The left table supplies a row even where the right table has no match.</p>
      <h2>Practice before checking the answer</h2>
      <p>Write a query that returns the name and number of sessions for every student, including Chen with zero sessions. Avoid <code>COUNT(*)</code>, which would count Chen's unmatched left-join row.</p>
      <details><summary>Show one possible solution</summary><pre><code>SELECT students.name, COUNT(sessions.student_id) AS session_count
FROM students
LEFT JOIN sessions ON sessions.student_id = students.id
GROUP BY students.id, students.name
ORDER BY students.id;</code></pre><p>Expected counts: Amina 2, Bilal 1, Chen 0.</p></details>
      <h2>Quick review</h2><ul><li>Which join includes Chen?</li><li>Why does Amina occur twice in the first result?</li><li>Which column should the count use to leave Chen at zero?</li></ul>
      <p><strong>Reference:</strong> <a href="https://www.postgresql.org/docs/current/tutorial-join.html">PostgreSQL tutorial: joins between tables</a>.</p>
    `
  }
];

export const articles = [
  {
    slug: 'how-to-turn-lecture-notes-into-practice',
    publishedAt: '2026-09-27',
    title: 'Turn Lecture Notes into Questions You Can Actually Answer',
    description: 'A step-by-step way to reorganize lecture notes into short explanations, self-test questions and a review schedule.',
    excerpt: 'A repeatable study workflow with an example from programming classes.',
    category: 'Study methods',
    readingMinutes: 3,
    body: `
      <p>Collecting notes is useful, but a page full of copied definitions is hard to study from. Try this workflow after a lecture: clean the notes, explain the idea in your own words, test yourself without looking, and record what you missed.</p>
      <h2>1. Mark the point of each section</h2>
      <p>For every heading, write a one-sentence answer to “What is this trying to teach me?” A heading like “Python functions” might become: “A function packages a task and optionally returns a value.” Keep the original example nearby so you can check your summary against it.</p>
      <h2>2. Turn facts into answerable questions</h2>
      <p>Change “The <code>return</code> statement passes a result to the caller” into “What does <code>return</code> do, and how is it different from <code>print</code>?” Write an answer in your own words. If the answer depends on code, add a tiny example you can run.</p>
      <h2>3. Make one exercise from each skill</h2>
      <p>For the functions example, write a function that converts study minutes to hours and test <code>0</code>, <code>30</code> and <code>90</code>. This exposes gaps that rereading can hide. Keep the expected output alongside the task so you know when you are done.</p>
      <h2>4. Revisit mistakes</h2>
      <p>After attempting a question, record what went wrong. For example: “I printed the answer but forgot to return it.” Put that question on your next review list. A short session revisiting errors is more targeted than copying the whole lecture again.</p>
      <h2>A five-minute template</h2>
      <ol><li>Topic: one precise title.</li><li>Explanation: two sentences in your words.</li><li>Example: a worked case or small program.</li><li>Questions: two recall questions and one practical task.</li><li>Next review: the questions you missed.</li></ol>
      <p>You can use the <a href="/note-editor">free note editor</a> to draft this structure, or start with the <a href="/study-notes/python-functions-beginner-notes/">free Python functions notes</a> as a worked example. The AI summarizer is optional and should be checked against the original material.</p>
    `
  },
  {
    slug: 'cornell-notes-for-programming-classes',
    publishedAt: '2026-09-27',
    title: 'Cornell Notes for Programming Classes: A Worked Example',
    description: 'Adapt the Cornell notes layout to a programming lesson using questions, code, error notes and a short summary.',
    excerpt: 'A concrete Cornell-style page for a Python function lesson.',
    category: 'Note-taking',
    readingMinutes: 2,
    body: `
      <p>The Cornell page format gives different jobs to three areas: a main notes column, a cue or question column, and a short summary at the bottom. For code-heavy classes, the main column should contain runnable examples and the cues should ask you to predict or change the code.</p>
      <h2>Worked page: Python return values</h2>
      <table><thead><tr><th>Cue or question</th><th>Notes and example</th></tr></thead><tbody><tr><td>What does <code>return</code> do?</td><td>It passes a value back to the caller. <code>def double(x): return x * 2</code></td></tr><tr><td>What if a function only prints?</td><td>The caller cannot reuse the printed result directly. A function without an explicit return returns <code>None</code>.</td></tr><tr><td>What should I test?</td><td>Try <code>double(0)</code>, <code>double(-2)</code> and <code>double(3)</code>.</td></tr></tbody></table>
      <p><strong>Bottom summary:</strong> Use <code>return</code> when later code needs a result. Use <code>print</code> to display something. A function can do both, but they are different actions.</p>
      <h2>Make the cue column useful</h2>
      <p>After class, cover the main notes and answer the questions. If you cannot explain one cue without peeking, add a smaller example or an error you encountered. A cue like “What is a function?” is often too broad; “What does this function return for <code>x = -2</code>?” is easier to test.</p>
      <h2>Template to copy</h2>
      <ol><li>Write the lesson title and date.</li><li>Put one runnable example and its expected result in the notes area.</li><li>Write two “why/how” cues and one prediction question.</li><li>End with a three-sentence summary and the next practice task.</li></ol>
      <p>Draft your own version in the <a href="/note-editor">free note editor</a>. For another tested code example, read the <a href="/study-notes/python-functions-beginner-notes/">Python functions note</a>.</p>
    `
  }
];

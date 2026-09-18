screen TodoList "The signed-in user's private todo list"
  navbar "Todo"
  row
    heading "My Todos"
    right
    button "New Todo" primary -> NewTodo
  row
    select "All | Active | Completed"
    right
    search "Search todos"
  table "Todo | Status"
    row "Buy groceries | Open"
    row "Write report | Open"
    row "Book dentist | Done"

screen NewTodo "Create a new todo"
  navbar "Todo"
  heading "New Todo"
  input "Title"
  row
    right
    button "Cancel" -> TodoList
    button "Save" primary -> TodoList

flow "Manage todos"
  role "User"
  description "A signed-in user creates todos and marks them complete or reopens them"
  TodoList
  NewTodo

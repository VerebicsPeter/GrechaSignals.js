import { Grecha } from "../grecha.js";
const { router, for$ } = Grecha;
import { useTodos } from "./useTodos.mjs";
import { TodoForm } from "./todoForm.mjs";
import { TodoItem } from "./todoItem.mjs";

const todos = [];
for (let i = 1; i <= 5; i++) {
  todos[i - 1] = {
    id: i,
    text: `Todo item #${i}`,
    done: false,
  };
}

const {
  getTodos,
  getShowDoneOnly,
  setShowDoneOnly,
  filterDone,
  createTodo,
  removeTodo,
} = useTodos(todos);

const root = router({
  "/": div(
    TodoForm({ getTodos, createTodo, getShowDoneOnly, setShowDoneOnly }),
    for$(getTodos, (todo) => TodoItem(todo, { getShowDoneOnly, removeTodo }), {
      id: (todo) => todo.id,
      filter: filterDone,
    })
  ),
});

entry.appendChild(root);

// for debugging expose stuff like this
window.getTodos = getTodos;

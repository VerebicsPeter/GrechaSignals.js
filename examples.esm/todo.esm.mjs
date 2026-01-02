import { Grecha } from "../grecha.js";
const { router, for$ } = Grecha;
import { useTodos } from "./useTodos.mjs";
import { useTodoFilter } from "./useTodoFilter.mjs";
import { TodoForm } from "./TodoForm.mjs";
import { TodoItem } from "./TodoItem.mjs";
import { TodoFilter } from "./TodoFilter.mjs";

const todos = [];
for (let i = 1; i <= 1000; i++) {
  todos[i - 1] = {
    id: i,
    text: `Todo item #${i}`,
    done: false,
  };
}

const {
  getTodos,
  createTodo,
  removeTodo,
} = useTodos(todos);

const {
  filterText,
  filterDone,
  filter, // derived filter function calculated based on filter state
} = useTodoFilter();

const root = router({
  "/": div(
    div(
      TodoForm({ getTodos, createTodo })
        .style$({marginRight: "0.5rem"}),
      TodoFilter({ filterText, filterDone })
        .style$({marginRight: "0.5rem"}),
    )
      .style$({display: "flex", marginBottom: "0.5rem"}),
    for$(getTodos, (todo) => TodoItem(todo, { filter, removeTodo }), { id: (todo) => todo.id })
  ),
});

entry.appendChild(root);

// for debugging expose stuff like this
window.getTodos = getTodos;

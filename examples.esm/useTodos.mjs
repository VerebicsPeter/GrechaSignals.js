import { Grecha } from "../grecha.js";
const { state$ } = Grecha;

export function useTodos(todos) {
  const [getTodos, setTodos, watchTodos] = state$(todos);

  watchTodos((todos) => console.log("Todos changed:", todos));

  const createTodo = (todo) => {
    const newTodos = getTodos();
    newTodos.push(todo);
    setTodos(newTodos);
  };

  const removeTodo = (todo) => {
    const newTodos = getTodos().filter((other) => other !== todo);
    setTodos(newTodos);
  };

  return {
    getTodos,
    setTodos,
    createTodo,
    removeTodo,
  };
}

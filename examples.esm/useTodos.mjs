import { Grecha } from "../grecha.js";
const { state$, derived$ } = Grecha;

export function useTodos(todos) {
  const [getTodos, setTodos, watchTodos] = state$(todos);
  const [getShowDoneOnly, setShowDoneOnly] = state$(false);
  
  const [filterDone] = derived$(
    getShowDoneOnly,
    (showDoneOnly) => (todo) => showDoneOnly ? todo.done : true
  );

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
    getShowDoneOnly,
    setShowDoneOnly,
    filterDone,
    createTodo,
    removeTodo,
  };
}

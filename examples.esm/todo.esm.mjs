import { Grecha } from "../grecha.js";
const { router, state$, derived$, ite$, for$ } = Grecha;

const todos = [];
for (let i = 1; i <= 6; i++) {
  todos[i-1] = {
    id: i,
    text: `Todo item #${i}`,
    done: false,
  };
}

const [getShowDoneOnly, setShowDoneOnly] = state$(false);
const [getTodos, setTodos, watchTodos] = state$(todos);

const [filter] = derived$(
  getShowDoneOnly,
  (showDoneOnly) => (todo) => showDoneOnly ? todo.done : true
);

const createTodo = (todo) => {
  const newTodos = getTodos();
  newTodos.push(todo);
  setTodos(newTodos);
};

const removeTodo = (todo) => {
  const newTodos = getTodos().filter((other)=>other!==todo);
  setTodos(newTodos);
};

const TodoForm = () => {
  const [getTodoId, setTodoId] = state$(getTodos().length);
  const [todoText] = state$("");

  const submit = () => {
    if (todoText()) {
      setTodoId(getTodoId() + 1); // increment id
      createTodo({ id: getTodoId(), text: todoText(), done: false });
    } else {
      alert("Please enter todo text.");
    }
  };

  const todoInput = input("text")
    .bind$("value", todoText)
    .on$("keydown", (evt) => evt.key === "Enter" && submit());

  return div(
    div("Todo Text: ", todoInput),
    
    button("Create Todo")
      .onclick$(submit),
    
    button(ite$(getShowDoneOnly, "Show All", "Show Done"))
      .onclick$(() => setShowDoneOnly(!getShowDoneOnly()))
  );
};

const TodoItem = (todo) => {
  const [getText, setText] = state$(todo.text);
  const [getDone, setDone] = state$(todo.done);
  const [shouldShow, setShouldShow] = state$(
    getShowDoneOnly() ? todo.done : true
  );

  return div(
    div("Todo: ", span(getText).style$({ fontWeight: "bold" })),
    div("Done: ", span(ite$(getDone, "Yes", "No"))),

    input("text")
      .bind$("value", setText)
      .on$("keyup", () => (todo.text = getText())),

    button("Remove")
      .onclick$(() => removeTodo(todo)),

    button(ite$(getDone, "Mark Todo", "Mark Done"))
      .onclick$(() => {
        setDone(!getDone());
        const isDone = getDone();
        todo.done = isDone;
        setShouldShow(getShowDoneOnly() ? isDone : true);
      })
  )
    .show$(shouldShow)
    .style$({ border: "1px solid black", marginTop: "1px"});
};

watchTodos((todos) => console.log("Todos changed:", todos));

const root = router({
  "/": div(
    TodoForm(),
    for$(getTodos, TodoItem, { id: (todo) => todo.id, filter })
  ),
});

entry.appendChild(root);

// for debugging expose stuff like this
window.getTodos = getTodos;

const express = require('express')
const app = express()
app.use(express.json())

const format = require('date-fns/format')
const isValid = require('date-fns/isValid')
const toDate = require('date-fns/toDate')
const {open} = require('sqlite')
const sqlite3 = require('sqlite3')
const path = require('path')
const databasePath = path.join(__dirname, 'todoApplication.db')
let database = null

const initializeDBAndServer = async () => {
  try {
    database = await open({
      filename: databasePath,
      driver: sqlite3.Database,
    })
    app.listen(3000, () => {
      console.log('Server is running at http:/localhost:3000/')
    })
  } catch (error) {
    console.log(error.message)
  }
}
initializeDBAndServer()

const checkRequestsQueries = async (request, response, next) => {
  const {search_q, category, priority, status, date} = request.query
  const {todoId} = request.params
  if (category !== undefined) {
    const categoryArray = ['WORK', 'HOME', 'LEARNING']
    const categoryIsInArray = categoryArray.includes(category)
    if (categoryIsInArray === true) {
      request.category = category
    } else {
      response.status(400)
      response.send('Invalid Todo Category')
      return
    }
  }

  if (priority !== undefined) {
    const priorityArray = ['HIGH', 'MEDIUM', 'LOW']
    const priorityIsInArray = priorityArray.includes(priority)
    if (priorityIsInArray === true) {
      request.priority = priority
    } else {
      request.status(400)
      response.send('Invalid Todo Priority')
      return
    }
  }

  if (status !== undefined) {
    const statusArray = ['TO DO', 'IN PROGRESS', 'DONE']
    const statusIsInArray = statusArray.includes(status)
    if (statusIsInArray === true) {
      request.status = status
    } else {
      request.status(400)
      response.send('Invalid Todo Status')
      return
    }
  }

  if (date !== undefined) {
    try {
      const myDate = new Date(date)
      const formatedDate = format(new Date(date), 'yyyy-MM-dd')
      const result = toDate(
        new Date(
          `${myDate.getFullYear()} - ${
            myDate.getMonth() + 1
          }-${myDate.getDate()}`,
        ),
      )
      const isValidDate = await isValid(result)
      if (isValidDate === true) {
        request.date = formatedDate
      } else {
        response.status(400)
        response.send('Invalid Due Date')
        return
      }
    } catch (error) {
      response.status(400)
      response.send('Invalid Due Date')
      return
    }
  }
  request.todoId = todoId
  request.search_q = search_q
  next()
}

const checkRequestsBody = (request, response, next) => {
  const {id, todo, category, priority, status, dueDate} = request.body
  const {todoId} = request.params

  if (category !== undefined) {
    categoryArray = ['WORK', 'HOME', 'LEARNING']
    categoryIsInArray = categoryArray.includes(category)
    if (categoryIsInArray === true) {
      request.category = category
    } else {
      response.status(400)
      response.send('Invalid Todo Category')
      return
    }
  }

  if (priority !== undefined) {
    priorityArray = ['HIGH', 'MEDIUM', 'LOW']
    priorityIsInArray = priorityArray.includes(priority)
    if (priorityIsInArray === true) {
      request.priority = priority
    } else {
      request.status(400)
      response.send('Invalid Todo Priority')
      return
    }
  }

  if (status !== undefined) {
    statusArray = ['TO DO', 'IN PROGRESS', 'DONE']
    statusIsInArray = statusArray.includes(status)
    if (statusIsInArray === true) {
      request.status = status
    } else {
      request.status(400)
      response.send('Invalid Todo Status')
      return
    }
  }

  if (dueDate !== undefined) {
    try {
      const myDate = new Date(dueDate)
      const formatedDate = format(new Date(dueDate), 'yyyy-MM-dd')
      const result = toDate(new Date(formatedDate))
      const isValidDate = isValid(result)
      if (isValidDate === true) {
        request.dueDate = formatedDate
      } else {
        response.status(400)
        response.send('Invalid Due Date')
        return
      }
    } catch (error) {
      response.status(400)
      response.send('Invalid Due Date')
      return
    }
  }
  request.todo = todo
  request.id = id
  request.todoId = todoId
  next()
}

app.get('/todos/', checkRequestsQueries, async (request, response) => {
  const {status = '', search_q = '', category = '', priority = ''} = request
  const getTodosQuery = `
  SELECT
      id,
      todo,
      priority,
      status,
      category,
      due_date AS dueDate
  FROM
      todo
  WHERE
      todo LIKE '%${search_q}%' 
      AND priority LIKE '%${priority}%'
      AND status LIKE '%${status}%'
      AND category LIKE '%${category}%';
  `

  const todosArray = await database.all(getTodosQuery)
  response.send(todosArray)
})

app.get('/todos/:todoId/', checkRequestsQueries, async (request, response) => {
  const {todoId} = request
  const getTodosQuery = `
  SELECT
      id,
      todo,
      priority,
      status,
      category,
      due_date AS dueDate
  FROM
      todo
  WHERE
      id = ${todoId};
  `
  const todo = await database.get(getTodosQuery)
  response.send(todo)
})

app.get('/agenda/', checkRequestsQueries, async (request, response) => {
  const {date} = request
  const selectDueDateQuery = `
  SELECT
      id,
      todo,
      priority,
      status,
      category,
      due_date AS dueDate
  FROM
      todo
  WHERE
     due_date = '${date}';
  `
  const todosArray = await database.all(selectDueDateQuery)
  if (todosArray === undefined) {
    response.status(400)
    response.send('Invalid Due Date')
  } else {
    response.send(todosArray)
  }
})

app.post('/todos/', checkRequestsBody, async (request, response) => {
  const {id, todo, category, priority, status, dueDate} = request
  const addTodoQuery = `
  INSERT INTO 
     todo (id, todo, priority, status, category, due_date) 
  VALUES
  (
    ${id},
    '${todo}',
    '${priority}',
    '${status}',
    '${category}',
    '${dueDate}}'
  ) 
  `
  const createUser = await database.run(addTodoQuery)
  response.send('Todo Successfully Added')
})

app.put('/todos/:todoId/', checkRequestsBody, async (request, response) => {
  const {todoId} = request
  const {priority, todo, status, category, dueDate} = request
  let updateTodoQuery = null
  switch (true) {
    case status !== undefined:
      updateTodoQuery = `
    UPDATE
        todo
    SET
        status = '${status}'
    WHERE 
        id = ${todoId};
    `
      await database.run(updateTodoQuery)
      response.send('Status Updated')
      break

    case priority !== undefined:
      updateTodoQuery = `
    UPDATE
        todo
    SET
        priority = '${priority}'
    WHERE 
        id = ${todoId};
    `
      await database.run(updateTodoQuery)
      response.send('Priority Updated')
      break

    case todo !== undefined:
      updateTodoQuery = `
    UPDATE
        todo
    SET
        todo = '${todo}'
    WHERE 
        id = ${todoId};
    `
      await database.run(updateTodoQuery)
      response.send('Todo Updated')
      break

    case category !== undefined:
      const updateCategoryQuery = `
  UPDATE
        todo
    SET
        category = '${category}'
    WHERE 
        id = ${todoId};
    `
      await database.run(updateCategoryQuery)
      response.send('Category Updated')
      break

    case dueDate !== undefined:
      const updatedDateQuery = `

    UPDATE
        todo
    SET
        due_date = '${dueDate}'
    WHERE 
        id = ${todoId};
    `
      await database.run(updatedDateQuery)
      response.send('Due Date Updated')
      break
  }
})
app.delete('/todos/:todoId/', async (request, response) => {
  const {todoId} = request.params
  const deleteTodoQuery = `
  DELETE FROM 
      todo 
  WHERE 
      id = ${todoId};
  `
  await database.run(deleteTodoQuery)
  response.send('Todo Deleted')
})
module.exports = app

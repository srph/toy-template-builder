import 'sanitize.css'
import 'font-awesome/css/font-awesome.css'
import './global.css'

import * as React from 'react'
import * as ReactDOM from 'react-dom'
import { Draggable, Droppable, DragDropContext, DropResult, DragStart } from 'react-beautiful-dnd'

import move from 'array-move'
import transfer from 'array-transfer'
import immer from 'immer'
import { useState } from 'react'

let id = 0

interface WidgetData {
  id: number
  name: string
  label: string
}

interface State {
  rows: {
    id: number
    columns: {
      id: number,
      widget: WidgetData,
      label: string
    }[]
  }[]
  widgets: WidgetData[]
  drag: DragStart | null
}

const widgets = [{
  id: ++id,
  name: 'text',
  label: 'Input'
}]

const init: State = {
  rows: [{
    id: ++id,
    columns: [{
      id: ++id,
      widget: widgets[0],
      label: 'Untitled'
    }]
  }],
  widgets,
  drag: null
}

function App() {
  const [state, dispatch] = useState<State>(init)

  function setState(func) {
    dispatch(immer(state, func))
  }

  function onDragStart(result: DragStart) {
    setState(state => {
      state.drag = result
    })
  }

  function onDragEnd(result: DropResult) {
    setState(state => {
      state.drag = null
    })

    if (result.destination == null) {
      return
    }

    // Make a new row (new widget -> new row)
    if (result.source.droppableId === 'widgets' && result.destination.droppableId === 'section') {
      setState(state => {
        state.rows.splice(result.destination.index, 0, {
          id: ++id,
          columns: [{
            id: ++id,
            widget: state.widgets[result.source.index],
            label: `Untitled ${id}`
          }]
        })
      })
    }

    // Make a new column (new widget -> existing row)
    if (result.source.droppableId === 'widgets' && result.destination.droppableId.startsWith('row-')) {
      const row = Number(result.destination.droppableId.replace('row-', ''))
      const column = result.destination.index

      setState(state => {
        state.rows[row].columns.splice(column, 0, {
          id: ++id,
          widget: state.widgets[result.source.index],
          label: `Untitled ${id}`
        })
      })
    }

    // Move around the row
    else if (result.source.droppableId === 'section' && result.destination.droppableId === 'section') {
      setState(state => {
        move.mutate(state.rows, result.source.index, result.destination.index)
      })
    }
  }

  return (
    <DragDropContext onDragStart={onDragStart} onDragEnd={onDragEnd}>
      <div className="editor-layout">
        <div className="editor-sidebar">
          <Droppable droppableId="widgets" isDropDisabled={true}>
            {(provided, snapshot) => (
              <div ref={provided.innerRef} {...provided.droppableProps}>
                {state.widgets.map((widget, i) => (
                  <Draggable draggableId={String(widget.id)} index={i} key={widget.id}>
                    {(provided, snapshot) => (
                      <div className="editor-widget" ref={provided.innerRef} {...provided.draggableProps} {...provided.dragHandleProps}>
                        <span className="icon">
                          <i className='fa fa-circle' />
                        </span>

                        <span className="text">
                          {widget.label}
                        </span>
                      </div>
                    )}
                  </Draggable>
                ))}

                {provided.placeholder}
              </div>
            )}
          </Droppable>
        </div>

        <div className="editor-content">
          <div className="editor-section">
            <Droppable droppableId="section">
              {(provided, snapshot) => (
                <div className="content" ref={provided.innerRef} {...provided.droppableProps}>
                  {state.rows.map((row, i) => (
                    <Draggable draggableId={String(row.id)} index={i} key={row.id}>
                      {(provided, snapshot) => (
                        <div className="row" ref={provided.innerRef} {...provided.draggableProps} {...provided.dragHandleProps}>
                          <Droppable droppableId={`row-${i}`} direction="horizontal" isDropDisabled={state.drag != null && state.drag.source.droppableId === 'section'}>
                            {(provided, snapshot) => (
                              <div className="content" ref={provided.innerRef} {...provided.droppableProps}>
                                {row.columns.map((column, j) => (
                                  <Draggable draggableId={String(column.id)} index={j} key={column.id}>
                                    {(provided, snapshot)=> (
                                      <React.Fragment>
                                        <div className="column" ref={provided.innerRef} {...provided.draggableProps} {...provided.dragHandleProps}>
                                          {column.label}

                                          {provided.placeholder}
                                        </div>
                                      </React.Fragment>
                                    )}
                                  </Draggable>
                                ))}

                                {provided.placeholder}
                              </div>
                            )}
                          </Droppable>
                        </div>
                      )}
                    </Draggable>
                  ))}

                  {provided.placeholder}
                </div>
              )}
            </Droppable>
          </div>
        </div>
      </div>
    </DragDropContext>
  )
}

ReactDOM.render(<App />, document.getElementById('mount'))
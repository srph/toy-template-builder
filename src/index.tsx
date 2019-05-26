import 'sanitize.css'
import 'font-awesome/css/font-awesome.css'
import './global.css'

import * as React from 'react'
import * as ReactDOM from 'react-dom'
import { Droppable, Draggable, DragDropContext } from 'react-beautiful-dnd'
import cx from 'classnames'
import immer from 'immer'

import move from 'array-move'
import transfer from 'array-transfer'
import { useReducer, useMemo, useRef } from 'react'
// import { useDrag, useDrop, DndProvider } from '~/lib/dnd'
import last from '~/utils/last'
import log from '~/utils/log'

interface WidgetColumn {
  id: number
  row_id: number | null
  position: number
  size: number
  type: string
  meta: {
    label: string
    value: any
  }
}

interface WidgetRow {
  id: number
  position: number
  columns: WidgetColumn[]
}

interface WidgetData {
  id: number
  label: string
  icon: string
  type: string
}

interface State {
  rows: WidgetRow[]
  widgets: WidgetData[]
  selected: {
    oldRow?: WidgetRow
    column: WidgetColumn
  } | null
}

type ReducerAction<T, P = null> = { type: T; payload?: P }

interface DropPayload {
  row: number
  column: number
}

type Action =
  | ReducerAction<'column:new', { destination: DropPayload; column: WidgetColumn }>
  | ReducerAction<'column:move', { source: DropPayload; destination: DropPayload }>
  | ReducerAction<'column:transfer', { source: DropPayload; destination: DropPayload }>
  | ReducerAction<'column:remove', { rowIndex: number; columnIndex: number }>
  | ReducerAction<'row:new', { index: number; row: WidgetRow }>

let id = 0

let position = 1024

function reducer(state: State, action: Action) {
  switch (action.type) {
    case 'column:new': {
      const { destination, column } = action.payload

      return immer(state, draft => {
        draft.rows[destination.row].columns.splice(destination.column, 0, column)
      })
    }

    case 'column:remove': {
      return immer(state, draft => {
        draft.rows[action.payload.rowIndex].columns.splice(action.payload.columnIndex, 1)
      })
    }

    case 'column:move': {
      const { source, destination } = action.payload

      return immer(state, draft => {
        const row = draft.rows[source.row]
        move.mutate(row.columns, source.column, destination.column)
      })
    }

    case 'column:transfer': {
      const { source, destination } = action.payload
      console.log(state.rows[source.row], state.rows[destination.row])

      return immer(state, draft => {
        const transferred = transfer(
          draft.rows[source.row].columns,
          draft.rows[destination.row].columns,
          source.column,
          destination.column
        )
        draft.rows[source.row].columns = transferred.source
        draft.rows[destination.row].columns = transferred.destination
      })
    }

    case 'row:new': {
      return immer(state, draft => {
        draft.rows.splice(action.payload.index, 0, action.payload.row)
      })
    }
  }
}

const init = {
  rows: [
    {
      id: ++id,
      position: ++position,
      columns: [
        {
          id: ++id,
          row_id: null,
          position: ++position,
          type: 'text',
          size: 1,
          meta: {
            label: 'First',
            value: ''
          }
        },
        {
          id: ++id,
          row_id: null,
          position: ++position,
          type: 'text',
          size: 1,
          meta: {
            label: 'Second',
            value: ''
          }
        }
      ]
    },

    {
      id: ++id,
      position: ++position,
      columns: [
        {
          id: ++id,
          row_id: null,
          position: ++position,
          type: 'text',
          size: 1,
          meta: {
            label: 'Third',
            value: ''
          }
        },
        {
          id: ++id,
          row_id: null,
          position: ++position,
          type: 'text',
          size: 1,
          meta: {
            label: 'Fourth',
            value: ''
          }
        }
      ]
    }
  ],
  widgets: [
    {
      id: ++id,
      label: 'Input',
      icon: 'text-width',
      type: 'text'
    }
  ],
  selected: null
}

function App() {
  const [state, dispatch] = useReducer(reducer, init)

  function handleColumnRemove(rowIndex, columnIndex) {
    dispatch({
      type: 'column:remove',
      payload: { rowIndex, columnIndex }
    })
  }

  function handleCreateRow(index: number) {
    dispatch({
      type: 'row:new',
      payload: {
        index: index + 1,
        row: {
          id: ++id,
          position: 1024,
          columns: []
        }
      }
    })
  }

  function handleDragEnd(result) {
    console.log(result)

    if (result.destination == null) {
      return
    }

  
    if (result.source.droppableId === 'widgets') {
      const widget = state.widgets[result.source.index]
      
      const row = state.rows.findIndex(row => row.id == result.destination.droppableId)

      const column = {
        id: ++id,
        row_id: -1,
        position: 1024,
        size: 1,
        type: widget.type,
        meta: {
          label: `Untitled ${id}`,
          value: ''
        }
      }

      dispatch({
        type: 'column:new',
        payload: {
          destination: {
            row,
            column: result.destination.index
          },
          column
        }
      })

      return
    }

    if (
      result.source.droppableId === result.destination.droppableId &&
      result.source.index === result.destination.index
    ) {
      return
    }

    if (result.source.droppableId === result.destination.droppableId) {
      const row = state.rows.findIndex(row => row.id == result.source.droppableId)

      dispatch({
        type: 'column:move',
        payload: {
          source: {
            row,
            column: result.source.index
          },
          destination: {
            row,
            column: result.destination.index
          }
        }
      })
    } else {
      const source = state.rows.findIndex(row => row.id == result.source.droppableId)

      const destination = state.rows.findIndex(row => row.id == result.destination.droppableId)

      dispatch({
        type: 'column:transfer',
        payload: {
          source: {
            row: source,
            column: result.source.index
          },
          destination: {
            row: destination,
            column: result.destination.index
          }
        }
      })
    }
  }

  return (
    <DragDropContext onDragEnd={handleDragEnd}>
      <div className="builder-layout">
        <Droppable droppableId="rows" type="row">
          {provided => (
            <div className="builder-content" ref={provided.innerRef} {...provided.droppableProps}>
              {state.rows.map((row, i) => (
                <React.Fragment key={row.id}>
                  <Draggable draggableId={String(row.id)} index={i}>
                    {(provided, snapshot) => (
                      <div
                        className={cx('builder-row', { 'is-dragging': snapshot.isDragging })}
                        ref={provided.innerRef}
                        {...provided.draggableProps}>
                        <div className="builder-row-handle" {...provided.dragHandleProps}>
                          <i className="fa fa-arrows" />
                        </div>

                        <Droppable
                          droppableId={`${row.id}`}
                          direction="horizontal"
                          isDropDisabled={row.columns.length === 3}>
                          {(provided, snapshot) => (
                            <div className="builder-row-panel" ref={provided.innerRef} {...provided.droppableProps}>
                              {row.columns.map((column, j) => (
                                <Column
                                  key={column.id}
                                  row={row}
                                  rowIndex={i}
                                  column={column}
                                  columnIndex={j}
                                  selected={state.selected && state.selected.column}
                                  onRemove={handleColumnRemove}
                                />
                              ))}
                            </div>
                          )}
                        </Droppable>

                        {provided.placeholder}
                      </div>
                    )}
                  </Draggable>

                  <CreatePod index={i} onCreate={handleCreateRow} />
                </React.Fragment>
              ))}
            </div>
          )}
        </Droppable>

        <Droppable droppableId="widgets" isDropDisabled>
          {(provided, snapshot) => (
            <React.Fragment>
              <div className="builder-widget-list" ref={provided.innerRef} {...provided.droppableProps}>
                <h4 className="heading">Widgets</h4>

                {state.widgets.map((widget, i) => (
                  <Widget key={widget.id} widget={widget} index={i} />
                ))}
              </div>

              <div style={{ display: 'none' }}>{provided.placeholder}</div>
            </React.Fragment>
          )}
        </Droppable>
      </div>
    </DragDropContext>
  )
}

interface CreatePodProps {
  index: number
  onCreate: (index: number) => void
}

function CreatePod(props: CreatePodProps) {
  function handleClick() {
    props.onCreate(props.index)
  }

  return (
    <div className="create-pod">
      <button onClick={handleClick}>
        <i className="fa fa-plus" />
      </button>
    </div>
  )
}

interface ColumnProps {
  row: WidgetRow
  rowIndex: number
  column: WidgetColumn
  columnIndex: number
  selected: WidgetColumn | null
  onRemove: (row: number, column: number) => void
}

function Column(props: ColumnProps) {
  function handleRemove() {
    props.onRemove(props.rowIndex, props.columnIndex)
  }

  return (
    <Draggable draggableId={String(props.column.id)} index={props.columnIndex}>
      {(provided, snapshot) => (
        <div className="column" ref={provided.innerRef} {...provided.draggableProps} {...provided.dragHandleProps}>
          <div className="builder-row-column-resizer">
            <div className="handle">
              <i className="fa fa-arrows-h" />
            </div>
            <div className="line" />
          </div>

          <div className="builder-row-column">
            <label className="label">{props.column.meta.label}</label>

            <div className="menu">
              <div className="more">
                <div className="action">
                  <button className="builder-row-action" onClick={handleRemove}>
                    <i className="fa fa-close" />
                  </button>
                </div>

                <div className="action">
                  <button className="builder-row-action">
                    <i className="fa fa-file-o" />
                  </button>
                </div>

                <div className="action">
                  <button className="builder-row-action is-handle">
                    <i className="fa fa-arrows" />
                  </button>
                </div>
              </div>

              <div className="initial">
                <button className="builder-row-action">
                  <i className="fa fa-cog" />
                </button>
              </div>
            </div>

            <input type="text" className="input" />
          </div>

          {provided.placeholder}
        </div>
      )}
    </Draggable>
  )
}

interface WidgetProps {
  widget: WidgetData
  index: number
}

function Widget(props: WidgetProps) {
  return (
    <Draggable draggableId={String(props.widget.id)} index={props.index}>
      {(provided, snapshot) => (
        <React.Fragment>
          <div className="builder-widget" ref={provided.innerRef} {...provided.draggableProps}>
            <span className="icon">
              <i className={`fa fa-${props.widget.icon}`} />
            </span>
            <span className="text">{props.widget.label}</span>
            <span className="handle" {...provided.dragHandleProps}>
              <i className="fa fa-ellipsis-v" />
            </span>
          </div>

          {provided.placeholder}
        </React.Fragment>
      )}
    </Draggable>
  )
}

function getColumnPosition(props: { row: WidgetRow; column: WidgetColumn; x: number }): number {
  if (props.row.columns.length === 0) {
    return 1024
  }

  const CONTAINER_WIDTH = 736
  const COLUMN_WIDTH = CONTAINER_WIDTH / 3
  const POSITION_BUFFER = 1024
  const POSITION_DELTA = 1.1

  const index = Math.floor((props.x / COLUMN_WIDTH) % COLUMN_WIDTH)

  // For first-positioned
  if (index === 0) {
    return props.row.columns[0].position / POSITION_DELTA
  }

  // For last-positioned
  if (index >= props.row.columns.length - 1) {
    return last(props.row.columns).position + POSITION_BUFFER
  }

  // For middle
  return (props.row.columns[0].position + last(props.row.columns).position) / POSITION_DELTA
}

// Gets the position after the provided index
function getNewRowPosition(props: { rows: WidgetRow[]; index: number }) {
  const sorted = [...props.rows].sort((a, b) => a.position - b.position)

  // Handle rows on the last position
  if (props.index === sorted.length - 1) {
    return last(sorted).position + 1024.0
  }

  return (sorted[props.index - 1].position + sorted[props.index].position) / 1.4
}

function composeRefs<T>(refs: React.Ref<T>[]): React.Ref<T> {
  return function(component: T) {
    refs.forEach(ref => {
      if (typeof ref === 'function') {
        ref(component)
      } else if (ref && 'current' in ref) {
        ref.current = component
      }
    })
  }
}

ReactDOM.render(<App />, document.getElementById('mount'))

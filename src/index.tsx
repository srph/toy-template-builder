import 'sanitize.css'
import 'font-awesome/css/font-awesome.css'
import './global.css'

import * as React from 'react'
import * as ReactDOM from 'react-dom'
import immer from 'immer'
import { useReducer, useMemo, useRef } from 'react'
import { useDrag, useDrop, DndProvider } from '~/lib/dnd'

type WidgetType = 'text' | 'number'

interface WidgetColumn {
  id: number
  row_id: number | null
  position: number
  size: number
  type: WidgetType
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
  type: WidgetType
}

interface State {
  rows: WidgetRow[]
  widgets: WidgetData[]
  selected: {
    oldRow?: WidgetRow,
    column: WidgetColumn
  } | null
}

type ReducerAction<T, P = null> = { type: T, payload?: P }

type Action = ReducerAction<'move.start', { oldRow?: WidgetRow, column: WidgetColumn }>
  | ReducerAction<'move.cancel'>
  | ReducerAction<'column:move', { row: WidgetRow, rowIndex: number, position: number }>
  | ReducerAction<'column:remove', { rowIndex: number, columnIndex: number }>

function reducer(state: State, action: Action) {
  switch(action.type) {
    case 'move.start': {
      return immer(state, draft => {
        draft.selected = {
          oldRow: action.payload.oldRow,
          column: action.payload.column
        }
      })
    }

    case 'move.cancel': {
      return immer(state, draft => {
        draft.selected = null
      })
    }

    case 'column:remove': {
      return immer(state, draft => {
        draft.rows[action.payload.rowIndex].columns.splice(action.payload.columnIndex, 1)
      })
    }

    case 'column:move': {
      return immer(state, draft => {
        const row = draft.rows[action.payload.rowIndex]

        // This means it's probably a new widget, so we won't remove anything.
        if (draft.selected.oldRow == null) {
          draft.selected.oldRow = action.payload.row
          draft.selected.column.row_id = action.payload.row.id,
          draft.selected.column.position = action.payload.position
          row.columns.push(draft.selected.column)
        }
        
        // If the user is just moving the widget around the row
        else if (draft.selected.oldRow.id === action.payload.row.id) {
          const column = row.columns.find(column => column.id === state.selected.column.id)
          column.position = action.payload.position
          draft.selected.oldRow = action.payload.row
        }

        // If the user is moving from two different rows
        else if (draft.selected.oldRow.id !== action.payload.row.id) {
          const oldRow = draft.rows.find(row => row.id === draft.selected.oldRow.id)
          const oldRowColumnIndex = row.columns.findIndex(column => column.id === state.selected.column.id)
          const column = oldRow[oldRowColumnIndex]
          column.position = action.payload.position
          draft.selected.oldRow = row
          oldRow.columns.splice(oldRowColumnIndex, 1)
          row.columns.push(column)
        }
      })
    }
  }
}

let id = 0
let position = 1024

const init = {
  rows: [{
    id: ++id,
    position: ++position,
    columns: [{
      id: ++id,
      row_id: null,
      position: ++position,
      type: ('text' as WidgetType),
      size: 1,
      meta: {
        label: 'First',
        value: ''
      }
    }]
  }],
  widgets: [{
    id: ++id,
    label: 'Input',
    icon: 'text-width',
    type: 'text'
  }],
  selected: null
}

function App() {
  const [state, dispatch] = useReducer(reducer, init)

  const builderRef = useRef<HTMLDivElement>()

  // https://github.com/react-dnd/react-dnd/issues/1326#issuecomment-485983701
  const stateRef = useRef<State>()
  stateRef.current = state

  const [dropProps, dropRef] = useDrop({
    accept: ['column', 'widget'],
    collect(monitor) {
      return {
        hovered: monitor.isOver()
      }
    },
    hover(item, monitor) {
      const state = stateRef.current

      const x = monitor.getClientOffset().x - builderRef.current.getBoundingClientRect().left
      const rowIndex = 0
      const row = state.rows[rowIndex]

      // We'll limit a row to have only 3 columns max
      // if (item.type === 'widget') {
      //   if (state.selected.oldRow == null && row.columns.length === 3) {
      //     return
      //   }

      //   const position = getColumnPosition({
      //     row,
      //     x
      //   })

      //   // If the user hasn't changed position, there's no need to alter state.
      //   if (position === item.position) {
      //     return
      //   }

      //   dispatch({
      //     type: 'column:move',
      //     payload: {
      //       row,
      //       rowIndex,
      //       position
      //     }
      //   })
      // }

      // The user is moving around, probably
      // if (item.type === 'column') {

      // }

      if (state.selected.oldRow == null && row.columns.length === 3) {
        return
      }

      const position = getColumnPosition({
        row,
        x
      })

      // If the user hasn't changed position, there's no need to alter state.
      if (item.type === 'column' ? position === item.column.position : position === item.widget.position) {
        return
      }

      dispatch({
        type: 'column:move',
        payload: {
          row,
          rowIndex,
          position
        }
      })
    }
  })

  function onWidgetDragStart(widget: WidgetData) {
    const column = {
      id: ++id,
      row_id: null,
      position: 1024,
      type: widget.type,
      size: 1,
      meta: {
        label: `Untitled ${id}`,
        value: ''
      }
    }

    dispatch({
      type: 'move.start',
      payload: { column }
    })
  }

  function onWidgetDragCancel() {
    dispatch({
      type: 'move.cancel'
    })
  }

  function handleColumnRemove(rowIndex, columnIndex) {
    dispatch({
      type: 'column:remove',
      payload: { rowIndex, columnIndex }
    })
  }

  function handleColumnDragStart(row: WidgetRow, column: WidgetColumn) {
    dispatch({
      type: 'move.start',
      payload: {
        oldRow: row,
        column
      }
    })
  }

  function handleColumnDragCancel() {
    dispatch({
      type: 'move.cancel'
    })
  }

  const sorted = useMemo(() => {
    return [...state.rows]
      .sort((a, b) => a.position - b.position)
      .map(row => {
        return {
          ...row,
          columns: [...row.columns].sort((a, b) => a.position - b.position)
        }
      })
  }, [state.rows])

  return (
    <div className="builder-layout">
      <div className="builder-content" ref={composeRefs([builderRef, dropRef])}>
        {sorted.map((row, i) =>
          <div className="builder-row" key={row.id}>
            <div className="builder-row-handle">
              <i className='fa fa-arrows' />
            </div>

            {row.columns.map((column, j) => 
              <Column key={column.id} row={row} rowIndex={i} column={column} columnIndex={j} selected={state.selected && state.selected.column} onDragStart={handleColumnDragStart} onDragCancel={handleColumnDragCancel} onRemove={handleColumnRemove} />
            )}
          </div>
        )}
      </div>

      <div className="builder-widget-list">
        <h4 className="heading">Widgets</h4>

        {state.widgets.map((widget, i) =>
          <Widget key={widget.id} widget={widget} onDragStart={onWidgetDragStart} onDragCancel={onWidgetDragCancel} />
        )}
      </div>
    </div>
  )
}

interface ColumnProps {
  row: WidgetRow
  rowIndex: number
  column: WidgetColumn
  columnIndex: number
  selected: WidgetColumn | null
  onDragStart: (row: WidgetRow, column: WidgetColumn) => void
  onDragCancel: () => void
  onRemove: (row: number, column: number) => void
}

function Column(props: ColumnProps) {
  const [dragProps, dragRef] = useDrag({
    item: {
      type: 'column',
      column: props.column
    },
    begin() {
      props.onDragStart(props.row, props.column)
    },
    end(monitor) {
      props.onDragCancel()
    }
  })

  if (props.selected && props.column.id === props.selected.id) {
    return (
      <div className="column" key={props.column.id}>
        <div className="builder-row-column-placeholder"></div>
      </div>
    )
  }

  function handleRemove() {
    props.onRemove(props.rowIndex, props.columnIndex)
  }

  return <div className="column" key={props.column.id} ref={dragRef}>
    <div className="builder-row-column-resizer">
      <div className="handle">
        <i className='fa fa-arrows-h' />
      </div>
      <div className="line"></div>
    </div>
    
    <div className="builder-row-column">
      <label className="label">
        {props.column.meta.label}
      </label>

      <div className="menu">
        <div className="more">
          <div className="action">
            <button className="builder-row-action" onClick={handleRemove}>
              <i className='fa fa-close' />
            </button>
          </div>

          <div className="action">
            <button className="builder-row-action">
              <i className='fa fa-file-o' />
            </button>
          </div>

          <div className="action">
            <button className="builder-row-action is-handle">
              <i className='fa fa-arrows' />
            </button>
          </div>
        </div>

        <div className="initial">
          <button className="builder-row-action">
            <i className='fa fa-cog' />
          </button>
        </div>              
      </div>

      <input type="text" className="input" />
    </div>
  </div>
}

interface WidgetProps {
  widget: WidgetData
  onDragStart: (widget: WidgetData) => void
  onDragCancel: () => void
}

function Widget(props: WidgetProps) {
  const [dragProps, dragRef] = useDrag({
    item: {
      type: 'widget',
      widget: props.widget
    },
    begin() {
      props.onDragStart(props.widget)
    },
    end(monitor) {
      props.onDragCancel()
    }
  })

  return (
    <div className="builder-widget" key={props.widget.id} ref={dragRef}>
      <span className="icon">
        <i className={`fa fa-${props.widget.icon}`} />
      </span>
      <span className="text">{props.widget.label}</span>
      <span className="handle">
        <i className='fa fa-ellipsis-v' />
      </span>
    </div>
  )
}

function getColumnPosition(props: { row: WidgetRow, x: number }): number { 
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

function last<T>(arr: T[]): T {
  return arr[arr.length - 1]
}

function log<T = any>(item: T): T {
  return console.log(item), item
}

function composeRefs<T>(refs: React.Ref<T>[]): React.Ref<T> {
  return function(component: T) {
    refs.forEach((ref) => {
      if (typeof ref === 'function') {
        ref(component)
      } else if (ref && 'current' in ref) {
        ref.current = component
      }
    })
  }
}

ReactDOM.render(
  <DndProvider>
    <App />
  </DndProvider>,
  document.getElementById('mount')
)
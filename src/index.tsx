import 'sanitize.css'
import 'font-awesome/css/font-awesome.css'
import './global.css'

import * as React from 'react'
import * as ReactDOM from 'react-dom'

import { useReducer, useEffect } from 'react'

type WidgetType = 'text' | 'number'

interface WidgetColumn {
  id: number
  position: number
  size: number
  type: WidgetType
  meta: {
    label: string
    value: any
  }
}

interface State {
  rows: {
    id: number
    position: number
    columns: WidgetColumn[]
  }[]
  selected: WidgetColumn | null
}

function reducer(state: State, action) {
  return state
}

let id = 0
let position = 1024

function App() {
  const [state, dispatch] = useReducer(reducer, {
    rows: [{
      id: ++id,
      position: ++position,
      columns: [{
        id: ++id,
        position: ++position,
        type: ('text' as WidgetType),
        size: 4,
        meta: {
          label: 'Untitled',
          value: ''
        }
      }]
    }],
    selected: null
  })

  return (
    <div className="builder-layout">
      <div className="builder-content">
        {state.rows.map((row, i) =>
          <div className="builder-row" key={i}>
            <div className="builder-row-handle">
              <i className='fa fa-arrows' />
            </div>

            {row.columns.map((column, j) =>
              <div className="column" key={j}>
                <div className="builder-row-column-resizer">
                  <div className="handle">
                    <i className='fa fa-arrows-h' />
                  </div>
                  <div className="line"></div>
                </div>
                
                <div className="builder-row-column">
                  <label className="label">
                    {column.meta.label}
                  </label>

                  <div className="menu">
                    <div className="more">
                      <div className="action">
                        <button className="builder-row-action">
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
            )}
          </div>
        )}
      </div>

      <div className="builder-widget-list">
        <h4 className="heading">Widgets</h4>

        <div className="builder-widget">
          <span className="icon">
            <i className='fa fa-text-width' />
          </span>
          <span className="text">Text</span>
          <span className="handle">
            <i className='fa fa-ellipsis-v' />
          </span>
        </div>
      </div>
    </div>
  )
}

ReactDOM.render(
  <App />,
  document.getElementById('mount')
)
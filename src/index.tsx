import 'sanitize.css'
import 'font-awesome/css/font-awesome.css'
import './global.css'

import * as React from 'react'
import * as ReactDOM from 'react-dom'
import { Draggable, Droppable, DragDropContext, DropResult, DragStart } from 'react-beautiful-dnd'

import move from 'array-move'
import transfer from 'array-transfer'
import immer from 'immer'
import useSetState from '~/lib/react-use/useSetState'
import cx from 'classnames'

let id = 0

interface WidgetData {
  id: number
  name: string
  label: string
  icon: string
  multiple?: boolean
}

interface WidgetOption {
  id: number
  label: string
}

interface WidgetChild {
  id: number
  widget: WidgetData
  label: string
  options?: WidgetOption[]
}

interface State {
  sections: {
    id: number
    label: string
    children: WidgetChild[]
  }[]
  widgets: WidgetData[]
  selected: number
  drag: DragStart | null
}

const widgets = [
  {
    id: ++id,
    name: 'text',
    label: 'Input',
    icon: 'text-width'
  },
  {
    id: ++id,
    name: 'number',
    label: 'Number',
    icon: 'hashtag'
  },
  {
    id: ++id,
    name: 'date',
    label: 'Date',
    icon: 'calendar'
  },
  {
    id: ++id,
    name: 'radio',
    label: 'Single Choice',
    icon: 'circle-o'
  },
  {
    id: ++id,
    name: 'checkbox',
    label: 'Multiple Choice',
    icon: 'check-square'
  }
]

const init: State = {
  sections: [
    {
      id: ++id,
      label: `Section 1`,
      children: [
        {
          id: ++id,
          widget: widgets[0],
          label: `Label 1`
        }
      ]
    }
  ],
  widgets,
  selected: -1,
  drag: null
}

function App() {
  const [state, internalSetState] = useSetState<State>(init)

  function setState(func) {
    internalSetState(prev => immer(prev, func))
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

    // A reorder of the sections
    if (result.type === 'sections') {
      setState(state => {
        move.mutate(state.sections, result.source.index, result.destination.index)
      })
    }

    // Widget to section widget list
    else if (result.source.droppableId === 'widgets') {
      const dest = {
        section: Number(result.destination.droppableId.replace('section-widget-list-', '')),
        index: result.destination.index
      }

      setState(state => {
        state.sections[dest.section].children.splice(dest.index, 0, {
          id: ++id,
          widget: state.widgets[result.source.index],
          label: `Label ${id}`
        })

        state.selected = id
      })
    }

    // Reorder of the widgets within a section
    else if (
      result.source.droppableId.startsWith('section-widget-list-') &&
      result.source.droppableId === result.destination.droppableId
    ) {
      const src = {
        section: Number(result.source.droppableId.replace('section-widget-list-', '')),
        index: result.source.index
      }
      const dest = {
        section: Number(result.source.droppableId.replace('section-widget-list-', '')),
        index: result.destination.index
      }
      setState(state => {
        state.selected = state.sections[src.section].children[src.index].id
        move.mutate(state.sections[src.section].children, src.index, dest.index)
      })
    }

    // Transfer a widgets to another section
    else if (
      result.source.droppableId.startsWith('section-widget-list-') &&
      result.source.droppableId !== result.destination.droppableId
    ) {
      const src = {
        section: Number(result.source.droppableId.replace('section-widget-list-', '')),
        index: result.source.index
      }
      const dest = {
        section: Number(result.destination.droppableId.replace('section-widget-list-', '')),
        index: result.destination.index
      }
      setState(state => {
        state.selected = state.sections[src.section].children[src.index].id
        const transferred = transfer(
          state.sections[src.section].children,
          state.sections[dest.section].children,
          src.index,
          dest.index
        )
        state.sections[src.section].children = transferred.source
        state.sections[dest.section].children = transferred.destination
      })
    }
  }

  function handleNewSection() {
    setState(state => {
      state.sections.push({
        id: ++id,
        label: `Section ${id}`,
        children: []
      })
    })
  }

  function handleDeleteSection(index: number) {
    setState(state => {
      state.sections.splice(index, 1)
    })
  }

  function handleDeleteChild(section: number, child: number) {
    setState(state => {
      state.sections[section].children.splice(child, 1)
    })
  }

  function handleDuplicateChild(section: number, child: number) {
    setState(state => {
      const original = state.sections[section].children[child]

      const duplicated = {
        ...original,
        id: ++id,
        label: `Copy of ${original.label}`
      }

      state.sections[section].children.splice(child + 1, 0, duplicated)

      state.selected = id
    })
  }

  function handleFocusChild(child: number) {
    setState(state => {
      state.selected = child
    })
  }

  return (
    <DragDropContext onDragStart={onDragStart} onDragEnd={onDragEnd}>
      <div>
        <div className="editor-sidebar">
          <div className="menu">
            <button className="ui-button">Cancel</button>
            <h5 className="title">Editor</h5>
            <button className="ui-button is-primary">Publish</button>
          </div>

          <Droppable droppableId="widgets" isDropDisabled={true}>
            {(provided, snapshot) => (
              <div className="list" ref={provided.innerRef} {...provided.droppableProps}>
                <h5 className="heading">Widgets</h5>

                {state.widgets.map((widget, i) => (
                  <Draggable draggableId={String(widget.id)} index={i} key={i}>
                    {(provided, snapshot) => (
                      <React.Fragment>
                        <div
                          className="editor-widget"
                          ref={provided.innerRef}
                          {...provided.draggableProps}
                          {...provided.dragHandleProps}>
                          <span className="icon">
                            <i className={`fa fa-${widget.icon}`} />
                          </span>

                          <span className="label">{widget.label}</span>
                        </div>

                        {snapshot.isDragging && (
                          <div className="editor-widget is-cloned">
                            <span className="icon">
                              <i className={`fa fa-${widget.icon}`} />
                            </span>

                            <span className="label">{widget.label}</span>
                          </div>
                        )}
                      </React.Fragment>
                    )}
                  </Draggable>
                ))}
              </div>
            )}
          </Droppable>

          <footer className="footer">
            <span className="name">Kier Borromeo</span>

            <div className="social">
              <a href="#" className="icon">
                <i className="fa fa-github" />
              </a>

              <a href="#" className="icon">
                <i className="fa fa-twitter" />
              </a>
            </div>
          </footer>
        </div>

        <div className="editor-layout">
          <div className="editor-cover">
            <div className="container">
              <div className="text">
                <input type="text" className="ui-clear-input is-h1" defaultValue="Easy Padala 2019" />
              </div>
            </div>
          </div>

          <div className="editor-content">
            <Droppable droppableId="sections" type="sections">
              {(provided, snapshot) => (
                <div className="editor-content-list" ref={provided.innerRef} {...provided.droppableProps}>
                  {state.sections.map((section, i) => (
                    <Draggable draggableId={String(section.id)} index={i} type="sections" key={section.id}>
                      {(provided, snapshot) => (
                        <div className={cx('editor-section', {
                          'is-dragging': snapshot.isDragging
                        })} ref={provided.innerRef} {...provided.draggableProps}>
                          <div className="count">
                            Section {i + 1} of {state.sections.length}
                          </div>
                          <div className="heading">
                            <div className="title">
                              <input type="text" defaultValue={section.label} className="ui-clear-input" />
                            </div>

                            <div className="menu">
                              {state.sections.length > 1 && (
                                <button type="button" className="action" onClick={() => handleDeleteSection(i)}>
                                  <i className="fa fa-trash" />
                                </button>
                              )}

                              <div className="action is-handle" {...provided.dragHandleProps}>
                                <i className="fa fa-ellipsis-v" />
                              </div>
                            </div>
                          </div>

                          <Droppable droppableId={`section-widget-list-${i}`}>
                            {(provided, snapshot) => (
                              <div className="content" ref={provided.innerRef} {...provided.droppableProps}>
                                {section.children.map((child, j) => (
                                  <Draggable draggableId={String(child.id)} index={j} key={child.id}>
                                    {(provided, snapshot) => (
                                      <React.Fragment>
                                        <div
                                          className={cx('editor-section-widget', {
                                            'is-dragging': snapshot.isDragging,
                                            'is-selected': state.selected === child.id,
                                          })}
                                          onClick={() => handleFocusChild(child.id)}
                                          ref={provided.innerRef}
                                          {...provided.draggableProps}>
                                          <div className="label">
                                            <input type="text" className="ui-clear-input" defaultValue={child.label} />

                                            <div className="info">
                                              <span className="icon">
                                                <i className={`fa fa-${child.widget.icon}`} />
                                              </span>

                                              <span className="text">{child.widget.label}</span>

                                              <span className="action" {...provided.dragHandleProps}>
                                                <i className="fa fa-ellipsis-v" />
                                              </span>
                                            </div>
                                          </div>

                                          <div className="input">
                                            <ChildForm child={child} />
                                          </div>

                                          <div className="footer">
                                            <div className="content">
                                              <div className="section">
                                                <button className="action" onClick={() => handleDeleteChild(i, j)}>
                                                  <i className="fa fa-trash" />
                                                </button>
                                              </div>

                                              <div className="section">
                                                <button className="action" onClick={() => handleDuplicateChild(i, j)}>
                                                  <i className="fa fa-file-o" />
                                                </button>
                                              </div>

                                              <div className="section">
                                                <div className="group">
                                                  <label className="label">Required</label>

                                                  <div className="ui-switch-toggle">
                                                    <div className="bar" />
                                                    <div className="control" />
                                                  </div>
                                                </div>
                                              </div>
                                            </div>
                                          </div>
                                        </div>

                                        {provided.placeholder}
                                      </React.Fragment>
                                    )}
                                  </Draggable>
                                ))}

                                {provided.placeholder}
                              </div>
                            )}
                          </Droppable>

                          {provided.placeholder}
                        </div>
                      )}
                    </Draggable>
                  ))}

                  {provided.placeholder}
                </div>
              )}
            </Droppable>

            <div className="new">
              <button className="button" onClick={handleNewSection}>
                <i className="fa fa-plus" />
              </button>
            </div>
          </div>
        </div>
      </div>
    </DragDropContext>
  )
}

interface ChildFormProps {
  child: WidgetChild
}

function ChildForm(props: ChildFormProps) {
  if (props.child.widget.name === 'date') {
    return (
      <div className="ui-input-group">
        <div className="placeholder">Month, day, year</div>
        <div className="icon">
          <i className="fa fa-calendar" />
        </div>
      </div>
    )
  }

  if (props.child.widget.name === 'radio') {
    return (
      <div>
        <div className="ui-checkbox-group">
          <div className="radio" />
          <input type="text" className="label" placeholder="Option" />
        </div>

        <div className="ui-checkbox-group">
          <div className="radio" />
          <input type="text" className="label" placeholder="Option" />
        </div>
      </div>
    )
  }

  if (props.child.widget.name === 'checkbox') {
    return (
      <div>
        <div className="ui-checkbox-group">
          <div className="checkbox" />
          <input type="text" className="label" placeholder="Option" />
        </div>

        <div className="ui-checkbox-group">
          <div className="checkbox" />
          <input type="text" className="label" placeholder="Option" />
        </div>
      </div>
    )
  }

  return <div className="ui-input">Short answer text</div>
}

ReactDOM.render(<App />, document.getElementById('mount'))

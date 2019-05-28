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
import { stat } from 'fs';

let id = 0

interface WidgetData {
  id: number
  name: string
  label: string
  icon: string
}

interface State {
  sections: {
    id: number,
    label: string,
    children: {
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
  label: 'Input',
  icon: 'text-width'
}, {
  id: ++id,
  name: 'number',
  label: 'Number',
  icon: 'hashtag'
}, {
  id: ++id,
  name: 'date',
  label: 'Date',
  icon: 'calendar'
}, {
  id: ++id,
  name: 'radio',
  label: 'Single Choice',
  icon: 'circle-o'
}, {
  id: ++id,
  name: 'checkbox',
  label: 'Multiple Choice',
  icon: 'check-square'
}]

const init: State = {
  sections: [{
    id: ++id,
    label: 'Untitled',
    children: [{
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

    // A reorder of the sections
    if (result.type === 'sections') {
      setState(state => {
        move.mutate(state.sections, result.source.index, result.destination.index)
      })
    }

    // Widget to section widget list
    else if (result.source.droppableId === 'widgets') {
      // Number(result.source.droppableId.replace('section-widget-list-', ''))
      const dest = {
        section: 0,
        index: result.destination.index
      }

      setState(state => {
        state.sections[dest.section].children.splice(dest.index, 0, {
          id: ++id,
          widget: state.widgets[result.source.index],
          label: `Untitled ${id}`
        })
      })
    }


    // Reorder of the widgets within a section
    else if (result.source.droppableId.startsWith('section-widget-list-') && result.source.droppableId === result.destination.droppableId) {
      // Number(result.source.droppableId.replace('section-widget-list-', ''))
      const src = {
        section: 0,
        index: result.source.index
      }
      const dest = {
        section: 0,
        index: result.destination.index
      }
      setState(state => {
        move.mutate(state.sections[src.section].children, src.index, dest.index)
      })
    }

    // Transfer a widgets to another section
    else if (result.source.droppableId.startsWith('section-widget-list-') && result.source.droppableId !== result.destination.droppableId) {
      const src = {
        section: Number(result.source.droppableId.replace('section-widget-list-', '')),
        index: result.source.index
      }
      const dest = {
        section: Number(result.destination.droppableId.replace('section-widget-list-', '')),
        index: result.destination.index
      }
      setState(state => {
        const transferred = transfer(state.sections[src.section].children, state.sections[dest.section].children, src.index, dest.index)
        console.log(transferred)
        state.sections[src.section].children = transferred.source
        state.sections[dest.section].children = transferred.destination
      })
    }
  }

  function handleNewSection() {
    setState(state => {
      state.sections.push({
        id: ++id,
        label: 'Untitled',
        children: []
      })
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
                  <Draggable draggableId={String(widget.id)} index={i} key={widget.id}>
                    {(provided, snapshot) => (
                      <div className="editor-widget" ref={provided.innerRef} {...provided.draggableProps} {...provided.dragHandleProps}>
                        <span className="icon">
                          <i className={`fa fa-${widget.icon}`} />
                        </span>

                        <span className="label">
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
          <div className="editor-content">
            <Droppable droppableId="sections" type="sections">
              {(provided, snapshot) => (
                <div className="editor-content-list" ref={provided.innerRef} {...provided.droppableProps}>
                  {state.sections.map((section, i) =>
                    <Draggable draggableId={String(section.id)} index={i} type="sections" key={section.id}>
                      {(provided, snapshot) => (
                        <div className="editor-section" ref={provided.innerRef} {...provided.draggableProps} {...provided.dragHandleProps}>
                          <div className="heading">
                            Untitled
                          </div>

                          <Droppable droppableId={`section-widget-list-${i}`}>
                            {(provided, snapshot) => (
                              <div className="content" ref={provided.innerRef} {...provided.droppableProps}>
                                {section.children.map((child, j) => (
                                  <Draggable draggableId={String(child.id)} index={j} key={child.id}>
                                    {(provided, snapshot) => (
                                      <React.Fragment>
                                        <div className="editor-section-widget" ref={provided.innerRef} {...provided.draggableProps} {...provided.dragHandleProps}>
                                          <div className="label">
                                            <span className="text">{child.label}</span>

                                            <div className="info">
                                              <span className="icon">
                                                <i className={`fa fa-${child.widget.icon}`} />
                                              </span>

                                              <span className="text">
                                                {child.widget.label}
                                              </span>
                                            </div>
                                          </div>
                                          <input type="text" className="ui-input" />
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
                  )}

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

ReactDOM.render(<App />, document.getElementById('mount'))
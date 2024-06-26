import React from 'react'
import PropTypes from 'prop-types'
import Tag from './Tag'
import Input from './Input'
import Suggestions from './Suggestions'
import { matchExact, matchPartial } from './concerns/matchers'

const KEYS = {
  COMMA: ',',
  ENTER: 'Enter',
  TAB: 'Tab',
  BACKSPACE: 'Backspace',
  UP_ARROW: 'ArrowUp',
  UP_ARROW_COMPAT: 'Up',
  DOWN_ARROW: 'ArrowDown',
  DOWN_ARROW_COMPAT: 'Down'
}

const CLASS_NAMES = {
  root: 'vc-tags',
  rootFocused: 'is-focused',
  selected: 'vc-tags--selected',
  selectedTag: 'vc-tags--selected-tag',
  selectedTagName: 'vc-tags--selected-tag-name',
  search: 'vc-tags--search',
  searchWrapper: 'vc-tags--search-wrapper',
  searchInput: 'vc-tags--search-input',
  suggestions: 'vc-tags--suggestions',
  suggestionActive: 'is-active',
  suggestionDisabled: 'is-disabled',
  suggestionPrefix: 'vc-tags--suggestion-prefix'
}

function findMatchIndex (options, query) {
  if (query === '') {
    return false
  }
  return options.findIndex((option) => {
    return matchExact(query).test(option.name)
  })
}

function pressDelimiter () {
  if (this.state.query.length >= this.props.minQueryLength) {
    // Check if the user typed in an existing suggestion.
    const match = findMatchIndex(this.state.options, this.state.query)

    const index = this.state.index === -1 ? match : this.state.index

    if (index > -1 && this.state.options[index]) {
      this.addTag(this.state.options[index])
    } else if (this.props.allowNew) {
      this.addTag({ name: this.state.query })
    }
  }
}

function pressUpKey (e) {
  e.preventDefault()

  // if first item, cycle to the bottom
  const size = this.state.options.length - 1
  this.setState({ index: this.state.index <= 0 ? size : this.state.index - 1 })
}

function pressDownKey (e) {
  e.preventDefault()

  // if last item, cycle to top
  const size = this.state.options.length - 1
  this.setState({ index: this.state.index >= size ? 0 : this.state.index + 1 })
}

function pressBackspaceKey () {
  // when backspace key is pressed and query is blank, delete the last tag
  if (!this.state.query.length) {
    this.deleteTag(this.props.tags.length - 1)
  }
}

function defaultSuggestionsFilter (item, query) {
  const regexp = matchPartial(query)
  return regexp.test(item.name)
}

function getOptions (props, state) {
  let options

  if (props.suggestionsTransform) {
    options = props.suggestionsTransform(state.query, props.suggestions)
  } else {
    options = props.suggestions.filter((item) => props.suggestionsFilter(item, state.query))
  }

  if (options.length === 0 && props.noSuggestionsText && !props.newTagPrefix) {
    options.push({ id: 0, name: props.noSuggestionsText, disabled: true, disableMarkIt: true })
  }

  options = options.slice(0, props.maxSuggestionsLength)

  if (props.allowNew && props.newTagPrefix && findMatchIndex(options, state.query) < 0) {
    options.push({ id: 0, name: state.query, prefix: props.newTagPrefix })
  }

  if (state.query !== '') {
    options = options.filter(option => option.name.includes(state.query))
  }

  return options
}

class ReactTags extends React.Component {
  constructor (props) {
    super(props)

    this.state = {
      query: '',
      focused: false,
      index: -1
    }

    this.inputEventHandlers = {
      // Provide a no-op function to the input component to avoid warnings
      // <https://github.com/i-like-robots/react-tags/issues/135>
      // <https://github.com/facebook/react/issues/13835>
      onChange: () => {
        // do nothing
      },
      onBlur: this.onBlur.bind(this),
      onFocus: this.onFocus.bind(this),
      onInput: this.onInput.bind(this),
      onKeyDown: this.onKeyDown.bind(this)
    }

    this.container = React.createRef()
    this.input = React.createRef()
    this.suggestions = React.createRef()
  }

  onInput (e) {
    const query = e.target.value

    if (this.props.onInput) {
      this.props.onInput(query)
    }

    // NOTE: This test is a last resort for soft keyboards and browsers which do not
    // support `KeyboardEvent.key`.
    // <https://bugs.chromium.org/p/chromium/issues/detail?id=763559>
    // <https://bugs.chromium.org/p/chromium/issues/detail?id=118639>
    if (
      query.length === this.state.query.length + 1 &&
      this.props.delimiters.indexOf(query.slice(-1)) > -1
    ) {
      pressDelimiter.call(this)
    } else if (
      query.length === this.state.query.length + 1 &&
      this.props.newTagDelimiters.indexOf(query.slice(-1)) > -1
    ) {
      this.addTag({ name: query.slice(0, -1) })
    } if (query !== this.state.query) {
      this.setState({ query })
    }
  }

  onKeyDown (e) {
    // when one of the terminating keys is pressed, add current query to the tags
    if (this.props.delimiters.indexOf(e.key) > -1) {
      if (this.state.query || this.state.index > -1) {
        e.preventDefault()
      }

      pressDelimiter.call(this)
    }

    // when backspace key is pressed and query is blank, delete the last tag
    if (e.key === KEYS.BACKSPACE && this.props.allowBackspace) {
      pressBackspaceKey.call(this, e)
    }

    if (e.key === KEYS.UP_ARROW || e.key === KEYS.UP_ARROW_COMPAT) {
      pressUpKey.call(this, e)
    }

    if (e.key === KEYS.DOWN_ARROW || e.key === KEYS.DOWN_ARROW_COMPAT || e.key === KEYS.TAB) {
      pressDownKey.call(this, e)
    }
  }

  onClick (e) {
    if (e.target !== e.currentTarget) {
      return
    }
    if (document.activeElement !== e.target) {
      this.input.current.input.current.focus()
    }
  }

  onBlur () {
    this.setState({ focused: false, index: -1 })

    if (this.props.onBlur) {
      this.props.onBlur()
    }

    if (this.props.addOnBlur) {
      pressDelimiter.call(this)
    }
  }

  onFocus () {
    this.setState({ focused: true })

    if (this.props.onFocus) {
      this.props.onFocus()
    }
  }

  onDeleteTag (index, event) {
    // Because we'll destroy the element with cursor focus we need to ensure
    // it does not get lost and move it to the next interactive element
    if (this.container.current) {
      const interactiveEls = this.container.current.querySelectorAll('a,button,input')

      const currentEl = Array.prototype.findIndex.call(interactiveEls, (element) => {
        return element === event.currentTarget
      })

      const nextEl = interactiveEls[currentEl - 1] || interactiveEls[currentEl + 1]

      if (nextEl) {
        nextEl.focus()
      }
    }

    this.deleteTag(index)
  }

  addTag (tag) {
    if (tag.disabled) {
      return
    }

    if (typeof this.props.onValidate === 'function' && !this.props.onValidate(tag)) {
      return
    }

    this.props.onAddition(tag)

    window.setTimeout(() => {
      this.clearInput()
    }, 1)
  }

  deleteTag (i) {
    this.props.onDelete(i)
  }

  clearInput () {
    this.setState({
      query: '',
      index: -1
    })
  }

  render () {
    const TagComponent = this.props.tagComponent || Tag

    const expanded = this.state.focused && this.state.query.length >= this.props.minQueryLength
    const classNames = [this.props.classNames.root]

    this.state.focused && classNames.push(this.props.classNames.rootFocused)

    let suggestionComponent = null
    if ((expanded && this.state.options.length && !this.props.isSuggestionsLoading) || (this.state.focused && this.props.showSuggestionsOnFocus)) {
      suggestionComponent = (
        <Suggestions
          {...this.state}
          id={this.props.id}
          ref={this.suggestions}
          classNames={this.props.classNames}
          addTag={this.addTag.bind(this)}
          disableMarkIt={this.props.disableMarkIt}
          suggestionComponent={this.props.suggestionComponent}
        />
      )
    }

    return (
      <div ref={this.container} className={classNames.join(' ')} onClick={this.onClick.bind(this)}>
        <div
          className={this.props.classNames.selected}
          aria-relevant='additions removals'
          aria-live='polite'
        >
          {this.props.tags.map((tag, i) => (
            <TagComponent
              key={i}
              tag={tag}
              removeButtonText={this.props.removeButtonText}
              classNames={this.props.classNames}
              onDelete={this.onDeleteTag.bind(this, i)}
              onTagChange={this.props.onTagChange.bind(this, i)}
              isTagEditable={this.props.isTagEditable}
              valid={this.props.validator ? this.props.validator(tag.name) : true}
              tagsState={this.state}
              id={this.props.id}
              suggestions={this.suggestions}
              handleAddTag={this.addTag.bind(this)}
              disableMarkIt={this.props.disableMarkIt}
              suggestionComponent={this.props.suggestionComponent}
            />
          ))}
        </div>
        <div className={this.props.classNames.search}>
          <Input
            {...this.state}
            id={this.props.id}
            ref={this.input}
            classNames={this.props.classNames}
            inputAttributes={this.props.inputAttributes}
            inputEventHandlers={this.inputEventHandlers}
            autoresize={this.props.autoresize}
            expanded={expanded}
            placeholderText={this.props.placeholderText}
            ariaLabelText={this.props.ariaLabelText}
          />
          {suggestionComponent}
        </div>
      </div>
    )
  }

  static getDerivedStateFromProps (props, state) {
    if (state.prevQuery !== state.query || state.prevSuggestions !== props.suggestions) {
      return {
        prevQuery: state.query,
        prevSuggestions: props.suggestions,
        options: getOptions(props, state)
      }
    }

    return null
  }
}

ReactTags.defaultProps = {
  id: 'vc-tags',
  tags: [],
  placeholderText: '',
  removeButtonText: 'Remove',
  noSuggestionsText: null,
  suggestions: [],
  suggestionsFilter: defaultSuggestionsFilter,
  suggestionsTransform: null,
  autoresize: true,
  classNames: CLASS_NAMES,
  delimiters: [KEYS.ENTER],
  newTagDelimiters: [KEYS.COMMA],
  minQueryLength: 2,
  maxSuggestionsLength: 20,
  allowNew: true,
  newTagPrefix: 'Add new: ',
  allowBackspace: true,
  addOnBlur: true,
  tagComponent: null,
  suggestionComponent: null,
  inputAttributes: {},
  disableMarkIt: true
}

ReactTags.propTypes = {
  id: PropTypes.string,
  tags: PropTypes.arrayOf(PropTypes.object),
  placeholderText: PropTypes.string,
  ariaLabelText: PropTypes.string,
  removeButtonText: PropTypes.string,
  noSuggestionsText: PropTypes.string,
  suggestions: PropTypes.arrayOf(PropTypes.object),
  suggestionsFilter: PropTypes.func,
  suggestionsTransform: PropTypes.func,
  autoresize: PropTypes.bool,
  delimiters: PropTypes.arrayOf(PropTypes.string),
  newTagDelimiters: PropTypes.arrayOf(PropTypes.string),
  onDelete: PropTypes.func.isRequired,
  onAddition: PropTypes.func.isRequired,
  onInput: PropTypes.func,
  onFocus: PropTypes.func,
  onBlur: PropTypes.func,
  onValidate: PropTypes.func,
  minQueryLength: PropTypes.number,
  maxSuggestionsLength: PropTypes.number,
  classNames: PropTypes.object,
  allowNew: PropTypes.bool,
  newTagPrefix: PropTypes.string,
  allowBackspace: PropTypes.bool,
  addOnBlur: PropTypes.bool,
  disableMarkIt: PropTypes.bool,
  tagComponent: PropTypes.oneOfType([
    PropTypes.func,
    PropTypes.element
  ]),
  suggestionComponent: PropTypes.oneOfType([
    PropTypes.func,
    PropTypes.element
  ]),
  inputAttributes: PropTypes.object
}

export default ReactTags

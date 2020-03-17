import React, { Component } from 'react';
import PropTypes from 'prop-types';
import { provideHooks } from 'redial';
import { connect } from 'react-redux';
import cn from 'classnames';
import reducer, * as chatActions from 'redux/modules/chat';

import { withApp } from 'hoc';
import MessageItem from 'components/MessageItem/MessageItem';
import { socket } from 'app';

@provideHooks({
  inject: ({ store }) => store.inject({ chat: reducer }),
  fetch: async ({ store: { dispatch, getState } }) => {
    const state = getState();
    console.warn('fetching1......', state);
    if (state.online) {
      await dispatch(chatActions.listVisitors());
      const data = await dispatch(chatActions.load()).catch(() => null);
      console.warn('fetching3......', data);
      return data;
    }
  }
})
@connect(
  state => ({
    loaded: state.chat.loaded,
    messages: state.chat.messages,
    visitors: state.chat.visitors,
    user: state.auth.user
  }),
  { ...chatActions }
)
@withApp
class Chat extends Component {
  static propTypes = {
    app: PropTypes.shape({
      service: PropTypes.func
    }).isRequired,
    user: PropTypes.shape({
      email: PropTypes.string
    }),
    addMessage: PropTypes.func.isRequired,
    patchMessage: PropTypes.func.isRequired,
    updateVisitors: PropTypes.func.isRequired,
    patchedMessage: PropTypes.func.isRequired,
    messages: PropTypes.arrayOf(PropTypes.object).isRequired,
    visitors: PropTypes.shape({
      authenticated: PropTypes.array,
      anonymous: PropTypes.number,
      connections: PropTypes.array
    }).isRequired,
    loaded: PropTypes.bool,
    load: PropTypes.func.isRequired
  };

  static defaultProps = {
    user: null,
    loaded: false
  };

  constructor(props) {
    super(props);
    this.messageList = React.createRef();
  }

  state = {
    message: '',
    error: null
  };

  componentDidMount() {
    const {
      app, addMessage, updateVisitors, patchedMessage, load, loaded
    } = this.props;
    console.warn('Chat.componentDidMount', this.props);
    const service = app.service('messages');

    service.on('created', addMessage);
    service.on('patchedMessage', patchedMessage);
    setImmediate(() => this.scrollToBottom());
    service.on('updateVisitors', updateVisitors);

    socket.emit('joinChat');

    // console.warn('fetching2......', loaded);
    if (!loaded) {
      load().catch(() => null);
      // load().then(d => {
      //   // const d = load();
      //   console.warn('fetching4......', d);

      // }).catch()
    }
  }

  componentDidUpdate(prevProps) {
    const { messages } = this.props;

    if (prevProps.messages.length !== messages.length) {
      this.scrollToBottom();
    }
  }

  componentWillUnmount() {
    const {
      app, addMessage, updateVisitors, patchedMessage
    } = this.props;

    app
      .service('messages')
      .removeListener('created', addMessage)
      .removeListener('patchedMessage', patchedMessage)
      .removeListener('updateVisitors', updateVisitors);
    socket.emit('leaveChat');
  }

  handleJoin = async () => {
    socket.emit('joinChat');
  };

  handleSubmit = async event => {
    const { app } = this.props;
    const { message } = this.state;

    event.preventDefault();

    try {
      await app.service('messages').create({ text: message });
      this.setState({
        message: '',
        error: false
      });
    } catch (error) {
      console.log(error);
      this.setState({ error: error.message || false });
    }
  };

  scrollToBottom() {
    this.messageList.current.scrollTop = this.messageList.current.scrollHeight;
  }

  render() {
    const {
      messages, visitors, user, patchMessage
    } = this.props;
    const { message, error } = this.state;

    const styles = require('./Chat.scss');

    return (
      <div className="container">
        <div className={cn('row', styles.chatWrapper)}>
          <div className={cn('col-sm-3', styles.userColumn)}>
            <h2 className="text-center">{visitors.authenticated.length + visitors.anonymous} Users</h2>

            <ul className="list-group">
              <li className="list-group-item text-center text-info">
                <b>{visitors.anonymous}</b> anonymous
              </li>
              {visitors.authenticated.map(visitor => (
                <li key={visitor._id} className="list-group-item">
                  {visitor.email}
                </li>
              ))}
            </ul>
          </div>
          <div className={cn('col-sm-9', styles.chatColumn)}>
            <h2 className="text-center">Messages</h2>

            <div className={styles.messages} ref={this.messageList}>
              {messages.map(msg => (
                <MessageItem key={msg._id} styles={styles} message={msg} user={user} patchMessage={patchMessage} />
              ))}
            </div>

            <form onSubmit={this.handleSubmit}>
              <label htmlFor="message">
                <em>{user ? user.email : 'Anonymous'}</em>{' '}
              </label>
              <div className={cn('input-group', { 'has-error': error })}>
                <input
                  type="text"
                  className="form-control"
                  name="message"
                  placeholder="Your message here..."
                  value={message}
                  onChange={event => this.setState({ message: event.target.value })}
                />
                <span className="input-group-btn">
                  <button className="btn btn-default" type="button" onClick={this.handleSubmit}>
                    Send
                  </button>
                </span>
                <button className="btn btn-default" type="button" onClick={this.handleJoin}>
                  join
                </button>
              </div>
            </form>
          </div>
        </div>
      </div>
    );
  }
}

export default Chat;

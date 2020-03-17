import React, { Component } from 'react';
import PropTypes from 'prop-types';
import { provideHooks } from 'redial';
import { connect } from 'react-redux';
import cn from 'classnames';
import {
  Button, Icon, Label, Grid
} from 'semantic-ui-react';
import ProgressBar from 'react-bootstrap/lib/ProgressBar';
// import Badge from 'react-bootstrap/lib/Badge'

import 'semantic-ui-css/semantic.min.css';
// import Smile from './smile.svg';
// import { ReactComponent as Smile } from './smile.svg';
// import { ReactComponent as Logo } from './talents.svg';

import reducer, * as blogActions from 'redux/modules/blog';

import { withApp } from 'hoc';
// import MessageItem from 'components/MessageItem/MessageItem';
import { socket } from 'app';
// import Smile from './icon-smile';

@provideHooks({
  inject: ({ store }) => store.inject({ blog: reducer }),
  fetch: async ({ store: { dispatch, getState } }) => {
    const state = getState();
    console.warn('fetching1......', state);
    if (state.online) {
      await dispatch(blogActions.listVisitors());
      const data = await dispatch(blogActions.load()).catch(() => null);
      console.warn('fetching3......', data);
      return data;
    }
  }
})
@connect(
  state => ({
    loaded: state.blog.loaded,
    posts: state.blog.posts,
    visitors: state.blog.visitors,
    votes: state.blog.votes || {},
    user: state.auth.user,
    byIds: state.blog.byIds
  }),
  { ...blogActions }
)
@withApp
class Blog extends Component {
  static propTypes = {
    app: PropTypes.shape({
      service: PropTypes.func
    }).isRequired,
    user: PropTypes.shape({
      email: PropTypes.string,
      _id: PropTypes.string
    }),
    addMessage: PropTypes.func.isRequired,
    // patchMessage: PropTypes.func.isRequired,
    updateBlogVisitors: PropTypes.func.isRequired,
    patchedMessage: PropTypes.func.isRequired,
    byIds: PropTypes.shape({}),
    updateVotes: PropTypes.func.isRequired,
    posts: PropTypes.arrayOf(PropTypes.object).isRequired,
    visitors: PropTypes.shape({
      authenticated: PropTypes.arrayOf(PropTypes.object),
      anonymous: PropTypes.number,
      connections: PropTypes.array,
      votes: PropTypes.object
    }).isRequired,
    votes: PropTypes.shape({
      up: PropTypes.number,
      down: PropTypes.number
    }),
    loaded: PropTypes.bool,
    load: PropTypes.func.isRequired
  };

  static defaultProps = {
    user: null,
    byIds: {},
    votes: {
      up: 0,
      down: 0
    },
    loaded: false
  };

  constructor(props) {
    super(props);
    this.postList = React.createRef();
  }

  state = {
    post: ''
    // error: null
  };

  componentDidMount() {
    const {
      app, addMessage, updateBlogVisitors, updateVotes, patchedMessage, load, loaded
    } = this.props;
    console.warn('Blog.componentDidMount', this.props);
    const service = app.service('posts');

    service.on('created', addMessage);
    service.on('patchedMessage', patchedMessage);
    setImmediate(() => this.scrollToBottom());
    service.on('updateBlogVisitors', updateBlogVisitors);

    service.on('updateVotes', updateVotes);

    socket.emit('joinBlog');

    // console.warn('fetching2......', loaded);
    if (!loaded) {
      load().catch(() => null);
      // load().then(d => {
      //   // const d = load();
      //   console.warn('fetching4......', d);

      // }).catch()
    }
    this.scrollToBottom();
  }

  componentDidUpdate(prevProps) {
    const { posts } = this.props;

    if (prevProps.posts.length !== posts.length) {
      this.scrollToBottom();
    }
  }

  componentWillUnmount() {
    const {
      app, addMessage, updateBlogVisitors, updateVotes, patchedMessage
    } = this.props;

    app
      .service('posts')
      .removeListener('created', addMessage)
      .removeListener('patchedMessage', patchedMessage)
      .removeListener('updateBlogVisitors', updateBlogVisitors)
      .removeListener('updateVotes', updateVotes);

    socket.emit('leaveBlog');
  }

  handleJoin = async () => {
    socket.emit('joinBlog');
  };

  handleSubmit = async event => {
    const { app } = this.props;
    const { post } = this.state;

    event.preventDefault();

    try {
      await app.service('posts').create({ text: post });
      this.setState({
        post: ''
        // error: false
      });
    } catch (error) {
      console.log(error);
      // this.setState({ error: error.post || false });
    }
  };

  handleVote = async event => {
    // const { app } = this.props;
    // const { post } = this.state;
    event.preventDefault();
    const { vote } = event.currentTarget.dataset;

    try {
      // await app.service('posts').create({ text: vote });
      socket.emit('postVote', { vote });
    } catch (error) {
      console.log(error);
    }
  };

  scrollToBottom() {
    this.postList.current.scrollTop = this.postList.current.scrollHeight;
  }

  render() {
    const { visitors, user } = this.props;
    // const { post, error } = this.state;
    const { votes } = visitors;

    const styles = require('./Blog.scss');
    // const votesUp =  posts.filter( m => m.text === '1' );
    // const votesDown =  posts.filter( m => m.text === '2' );
    // const votesAll =  votesUp.length + votesDown.length;

    const votesUp = (votes && votes.up) || 0;
    const votesDown = (votes && votes.down) || 0;
    const votesAll = votesUp + votesDown;

    const myVotes = visitors.authenticated.find(e => e._id === user._id);
    console.log(this.props);

    return (
      <div className="container">
        <div className={cn('row', styles.blogWrapper)}>
          <div className={cn('col-sm-3', styles.userColumn)}>
            <h2 className="text-center">{visitors.authenticated.length} Users</h2>

            <ul className="list-group">
              {/* <li className="list-group-item text-center text-info">
                <b>{visitors.anonymous}</b> anonymous
              </li> */}
              {visitors.authenticated.map(visitor => (
                <li key={visitor._id} className="list-group-item">
                  {visitor.email}
                  {/* <pre>{visitor.vote && JSON.stringify({ down: visitor.vote.down, up: visitor.vote.up })}</pre> */}
                  <div>
                    {visitor.vote ? (
                      <Label as="span" basic color="green">
                        {visitor.vote.up}
                      </Label>
                    ) : null}

                    {visitor.vote ? (
                      <Label as="span" basic color="red">
                        {visitor.vote.down}
                      </Label>
                    ) : null}
                  </div>
                </li>
              ))}
              {/* {visitors.gosts && visitors.gosts.map(visitor => (
                <li key={visitor._id} className="list-group-item">
                  {visitor.name}
                </li>
              ))} */}
            </ul>
          </div>
          <div className={cn('col-sm-9', styles.blogColumn)}>
            <h2 className="text-center">Messages</h2>

            <div style={{ minHeight: '400px' }} className={styles.posts} ref={this.postList}>
              {/* {posts.map(msg => (
                <MessageItem key={msg._id} styles={styles} message={msg} user={user} patchMessage={patchMessage} />
              ))} */}
            </div>

            <ProgressBar>
              <ProgressBar active striped bsStyle="success" now={(votesUp / votesAll) * 100} key={1} />
              <ProgressBar active striped bsStyle="danger" now={(votesDown / votesAll) * 100} key={2} />
            </ProgressBar>

            <form onSubmit={this.handleSubmit}>
              <label htmlFor="post">
                <em>{user ? user.email : 'Anonymous'}</em>{' '}
              </label>
              {/* <div className={cn('input-group', { 'has-error': error })}>
                <input
                  type="text"
                  className="form-control"
                  name="post"
                  placeholder="Your post here..."
                  value={post}
                  onChange={event => this.setState({ post: event.target.value })}
                />
                <span className="input-group-btn">
                  <button className="btn btn-default" type="button" onClick={this.handleSubmit}>
                    Send
                  </button>
                </span>
              </div> */}
            </form>

            {/* <pre><code>{JSON.stringify(visitors, null, 2)}</code></pre>
            <pre><code>{JSON.stringify(myVotes, null, 2)}</code></pre> */}

            <Grid verticalAlign="middle" columns={4} centered style={{ paddingTop: '1em' }}>
              <Grid.Row>
                <Grid.Column textAlign="right">
                  <Button as="div" labelPosition="right" data-vote="1" onClick={this.handleVote}>
                    <Button color="green">
                      <Icon name="thumbs up" size="huge" style={{ marginLeft: 0, marginRight: 0 }} />
                      {/* Like */}
                    </Button>
                    <Label as="a" basic color="green" pointing="left">
                      {(myVotes && myVotes.vote && myVotes.vote.up) || '0'}
                      {' of '}
                      {votes && votes.up}
                    </Label>
                  </Button>
                </Grid.Column>
                <Grid.Column textAlign="center">
                  <h2>{votesAll}</h2>
                </Grid.Column>
                <Grid.Column textAlign="left">
                  <Button as="div" labelPosition="left" data-vote="2" onClick={this.handleVote}>
                    <Label as="a" basic color="red" pointing="right">
                      {(myVotes && myVotes.vote && myVotes.vote.down) || '0'}
                      {' of '}
                      {votes && votes.down}
                    </Label>
                    <Button color="red">
                      <Icon name="thumbs down" size="huge" style={{ marginLeft: 0, marginRight: 0 }} />
                      {/* Dislike */}
                    </Button>
                  </Button>
                </Grid.Column>
              </Grid.Row>
            </Grid>

            <div className="d-flex">
              {/*
              <div>
              <Smile />
              </div>


              <svg>
                <g transform='translate(0,60)'>
                  <rect width="100" height="100" />
                  <circle r="15" fill='red' id='c' cx="25" cy="30" />
                  <circle r="15" fill='red' id='c' cx="75" cy="30" />
                  <g transform='translate(15,65)'>
                    <path d="M0,0 A40,40 10 0,0 65,0" fill="none" stroke="white" strokeWidth="5" />
                  </g>
                </g>
              </svg>
              */}
            </div>
          </div>
        </div>
      </div>
    );
  }
}

export default Blog;

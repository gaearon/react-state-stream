/*global -React */
var React = require('react');
var M = require('mori');
var stateStream = require('./stateStream');
var easingTypes = require('./easingTypes');

function toObj(children) {
  return React.Children.map(children, function(child) {
    return child;
  });
}

function diff(o1, o2) {
  var res = [];
  for (var key in o1) {
    if (!o1.hasOwnProperty(key)) {
      continue;
    }
    if (!o2.hasOwnProperty(key)) {
      res.push(key);
    }
  }

  return res;
}

var Container = React.createClass({
  mixins: [stateStream.Mixin],
  getInitialStateStream: function() {
    var children = toObj(this.props.children);
    var configs = {};
    for (var key in children) {
      if (!children.hasOwnProperty(key)) {
        continue;
      }
      configs[key] = {
        top: 0,
        width: 10,
        opacity: 1,
      };
    }

    return M.repeat(1, M.js_to_clj({
      children: children,
      configs: configs,
    }));
  },

  componentWillUpdate: function(nextProps) {
    var o1 = toObj(nextProps.children);
    var o2 = toObj(this.props.children);
    var enters = diff(o1, o2);
    var exits = diff(o2, o1);

    if (exits.length === 0 && enters.length === 0) {
      return;
    }

    // For some reason, toObj messes up key order here:
    var children = M.js_to_clj(/*toObj(*/nextProps.children/*)*/);
    var duration = 1700;
    var frameCount = stateStream.toFrameCount(duration);
    var initState = this.state;
    var newStream = this.stream;

    if (exits.length > 0) {

      var chunk = M.map(function(stateI, i) {
        exits.forEach(function(exitKey) {
          var ms = stateStream.toMs(i);
          var config = initState.configs[exitKey];

          stateI = M.assoc_in(stateI, ['configs', exitKey], M.hash_map(
            'top', easingTypes.easeInOutQuad(ms, config.top, -200, duration),
            'opacity', easingTypes.easeInOutQuad(ms, config.opacity, 0, duration),
            'width', easingTypes.easeInOutQuad(ms, config.width, 0, duration)
          ));
        });

        return stateI;
      }, stateStream.take2(frameCount, newStream), M.range());

      var restChunk = M.map(function(stateI) {
        exits.forEach(function(exitKey) {
          stateI = M.assoc(
            stateI,
            'children', children,
            'configs', M.dissoc(M.get(stateI, 'configs'), exitKey)
          );
        });

        return stateI;
      }, M.drop(frameCount, newStream)); // can't cacheResult here bc the perf would be horrible

      newStream = M.concat(chunk, restChunk);
    }

    if (enters.length > 0) {
      var chunk2 = M.map(function(stateI, i) {
        enters.forEach(function(enterKey) {
          var ms = stateStream.toMs(i);
          var config = initState.configs[enterKey];

          stateI = M.assoc_in(stateI, ['configs', enterKey], M.hash_map(
            'top', easingTypes.easeInOutQuad(ms, config ? config.top : -200, 0, duration),
            'opacity', easingTypes.easeInOutQuad(ms, config ? config.opacity : 0, 1, duration),
            'width', easingTypes.easeInOutQuad(ms, config ? config.width : 0, 10, duration)
          ));
          stateI = M.assoc(stateI, 'children', children);
        });

        return stateI;
      }, stateStream.take2(frameCount, newStream), M.range());

      var restChunk2 = M.map(function(stateI) {
        enters.forEach(function(enterKey) {
          stateI = M.assoc_in(stateI, ['configs', enterKey], M.hash_map(
            'top', 0,
            'width', 10,
            'opacity', 1
          ));
          stateI = M.assoc(stateI, 'children', children);
        });

        return stateI;
      }, M.drop(frameCount, newStream));

      newStream = M.concat(chunk2, restChunk2);
    }

    this.setStateStream(newStream);
  },

  render: function() {
    var state = this.state;
    var children = [];

    /*
    for (var key in state.children) {
      if (!state.children.hasOwnProperty(key)) {
        continue;
      }
      var s = {
        top: state.configs[key].top,
        width: state.configs[key].width,
        opacity: state.configs[key].opacity,
        position: 'relative',
        overflow: 'hidden',
        WebkitUserSelect: 'none',
      };
      children.push(
        <span style={s} key={key}>{state.children[key]}</span>
      );
    }
    */

    for (var index in state.children) {
      if (!state.children.hasOwnProperty(index)) {
        continue;
      }

      // Why do I have to do this?
      var key = '.$' + state.children[index].key;

      var s = {
        top: state.configs[key].top,
        width: state.configs[key].width,
        opacity: state.configs[key].opacity,
        position: 'relative',
        overflow: 'hidden',
        WebkitUserSelect: 'none',
      };
      children.push(
        <span style={s} key={key}>{state.children[index]}</span>
      );
    }
    return (
      <div>
        {children}
      </div>
    );
  }
});

if (module.makeHot) {
  Container = module.makeHot(Container);
}

// notice that this component is ignorant of both immutable-js and the animation
var App3 = React.createClass({
  getInitialState: function () {
    return { text: 'Hello' };
  },

  handleClick: function () {
    if (this.state.text === 'Hello') {
      this.setState({ text: 'Hello, world' });
    } else {
      this.setState({ text: 'Hello' });
    }
  },

  render: function() {
    return (
      <div style={{ marginTop: 20 }} onClick={this.handleClick}>
        <Container>
          {this.state.text.split('').map(function (l, i) {
            return <span key={i}>{l}</span>;
          })}
        </Container>
      </div>
    );
  }
});

module.exports = App3;

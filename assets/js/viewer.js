/**
*  @todo: terminology, memory management, exceptions
*/

(function(scope, $, TweenLite) {

  'use strict';

  var debug = false;

  // Public Viewer
  scope.Viewer = function Viewer(options) {

    // Private ImageViewer
    var viewer = new ImageViewer(options);

    this.start = function() {
      viewer.start.apply(viewer, arguments);
    };

    this.stop = function() {
      viewer.stop.apply(viewer, arguments);
    };

    this.show = function() {
      viewer.show.apply(viewer, arguments);
    };

    this.hide = function() {
      viewer.hide.apply(viewer, arguments);
    };

    this.close = function() {
      viewer.close.apply(viewer, arguments);
    };

    this.next = function() {
      viewer.next.apply(viewer, arguments);
    };

    this.previous = function() {
      viewer.previous.apply(viewer, arguments);
    };

    this.goto = function() {
      viewer.goto.apply(viewer, arguments);
    };

    this.isRunning = function() {
      viewer.isRunning.apply(viewer, arguments);
    };

    this.isShifting = function() {
      viewer.isShifting.apply(viewer, arguments);
    };

    this.isHidden = function() {
      viewer.isHidden.apply(viewer, arguments);
    };
    
    this.on = function() {
      viewer.on.apply(viewer, arguments);
    };
    
    this.off = function() {
      viewer.off.apply(viewer, arguments);
    };
    
    this.trigger = function() {
      viewer.trigger.apply(viewer, arguments);
    };

    this.dispose = function() {
      viewer.dispose.apply(viewer, arguments);
    };
  }

  // Logger

  var log = function() {
    if (debug) {
      console.log.apply(console, arguments);
    }
  }.bind(this);

  // ImageViewer
  
  function ImageViewer(options) {
  
    this.initialize(options);
  }
  
  ImageViewer.prototype = {
  
    constructor: ImageViewer,
    
    container: null,
    visual: null,
    nextVisual: -1,
    previousVisual: 0,
    direction: 0,
    intention: 0,
    running: false,
    shifting: false,
    hidden: true,
    select: false,
    
    defaults: {

      element: 'body',
      file: 'data.json',
      directory: '',
      selector: 'img',
      target: 'href',
      data: [],
      entry: 'file',
      classPrefix: 'viewer-',
      containerClass: 'container',
      visualClass: 'visual',
      nextClass: 'next',
      previousClass: 'previous',
      closeClass: 'close',
      overlayClass: 'overlay',
      activeClass: 'active',
      visualDuration: 0.3,
      resizeDuration: 0.3,
      shiftDelay: 2,
      maxWidth: 7680,
      maxHeight: 4320,
      verticalOffset: 60,
      horizontalOffset: 60,
      overlayOpacity: 0.5,
      userInterface: false,
      cssBackground: false,
      resizeContainer: false,
      shiftRandom: false, // true, false, first
      shiftBackwards: false,
      disposeOnClose: false,
      flip: false,
      controls: true,
      callback: function() {}
    },
    
    initialize: function(options) {

      this.options = options || {};

      this.dispatcher = $('<div></div>');

      this.select = typeof this.options.selector === 'string';

      // Very rudimentary mobile test for now
      this.mobile = /iphone|ipad|ipod|android|windows *phone/i.test(navigator.userAgent);

      this.assign();
      this.setup();
      this.get();
    },

    assign: function(defaults) {

      defaults = this.object('defaults', defaults);
      
      for (var key in defaults) {
        if (defaults.hasOwnProperty(key) && typeof this[key] === 'undefined') {
          this.default(key, typeof defaults[key], defaults[key]);
        }
      }
    },

    default: function(name, type, value, options) {

      options = this.object('options', options);
      
      this[name] = (typeof options[name] === type) ? options[name] : value;
    },
    
    object: function(name, value) {

      return (typeof value === 'object') ? value : typeof this[name] === 'object' ? this[name] : {};
    },
    
    get: function() {

      if (this.data instanceof Array && this.data.length > 0) {
        this.execute(this.data);
      } else {
        if (this.select) {
          var data = [];

          this.elements = this.elements || $(this.selector);

          this.elements.each(function(index, element){
            var element = $(element);
            data.push({file: element.data(this.target)});
            element.data('index', index);
          }.bind(this));

          this.execute(data);
        } else {
          this.fetch(this.file, this.execute.bind(this));
        }
      }
    },

    execute: function(data) {

      if (typeof data === 'string') {
        data = $.parseJSON(data);
      }
      
      if (data instanceof Array) {
        this.data = data;
      }

      if (typeof this.callback === 'function') {
        this.callback(this, this.data);
      }
    },
    
    fetch: function(file, callback) {

      file = (typeof file === 'string') ? file : this.file;
      
      callback = (typeof callback === 'function') ? callback : function(data){console.log(data);};

      $.getJSON(file, callback);
    },

    refresh: function(options) {

      this.constructor.call(this, options);
    },
    
    setup: function() {

      if (this.select) {
        this.elements = this.elements || $(this.selector);
        this.elements.on('click', this.activate.bind(this));
        this.elements.css({
          cursor: 'pointer'
        });
      }

      this.element = $(this.element);
      this.hidden = true;
      
      this.container = $('<div>', {
        class: this.classPrefix + this.containerClass,
        style: 'display: none; opacity: 0;'
      });
      
      var element = this.cssBackground ? '<div>' : '<img>';
      
      var inactive = $(element, {
        class: this.classPrefix + this.visualClass,
        style: 'display: none; opacity: 0; z-index: 2;'
      });
      
      var active = $(element, {
        class: this.classPrefix + this.visualClass + ' ' +
             this.classPrefix + this.activeClass,
        style: 'display: block; opacity: 1; z-index: 3;'
      });
      
      this.element.append(this.container.append(inactive, active));
      
      if (this.userInterface) {
        this.interface();
      }
      
      if (this.resizeContainer) {
        $(window).on('resize', this.resize.bind(this));
      }

      if (this.controls) {
        $(window).on('keydown', this.onKey.bind(this));
      }

      this.trigger('setup');
    },
    
    interface: function() {

      var overlay = $('<div>', {
        class: this.classPrefix + this.overlayClass,
        style: 'opacity: 0; z-index: 0;'
      });
      
      var next = $('<div>', {
        class: this.classPrefix + this.nextClass,
        style: 'cursor: pointer; z-index: 4;'
      });
      
      var previous = $('<div>', {
        class: this.classPrefix + this.previousClass,
        style: 'cursor: pointer; z-index: 4;'
      });
      
      var close = $('<div>', {
        class: this.classPrefix + this.closeClass,
        style: 'cursor: pointer; z-index: 4;'
      });
      
      next.on('click', this.next.bind(this));
      previous.on('click', this.previous.bind(this));
      close.on('click', this.close.bind(this));
      overlay.on('click', this.close.bind(this));

      this.container.prepend(overlay);
      this.container.append(next, previous, close);

      var overlay = $('.' + this.classPrefix + this.overlayClass);
      
      TweenLite.to(overlay, this.visualDuration, {
        opacity: this.overlayOpacity,
        ease: Linear.easeNone
      });

      this.trigger('interface');
    },
    
    next: function() {

      if (this.shifting) {
        return;
      }

      if (this.nextVisual === -1) {
        this.intention = 0;
      } else {
        this.intention = 1;
      }
      
      this.previousVisual = this.nextVisual;
      
      if (this.shiftRandom) {
        this.nextVisual = this.randomIndex();

        if (this.nextVisual > this.previousVisual) {
          this.direction = 1;
        } else if (this.nextVisual < this.previousVisual) {
          this.direction = -1;
        } else {
          this.direction = 0;
        }
        
        if (this.shiftRandom === 'first') {
          this.shiftRandom = false;
        }
      } else if (++this.nextVisual >= this.data.length) {
        this.direction = -1;
        this.nextVisual = 0;
      } else {
        this.direction = 1;
      }

      this.load();
      
      this.trigger('next');
    },
    
    previous: function() {

      if (this.shifting) {
        return;
      }

      if (this.nextVisual === -1) {
        this.intention = 0;
      } else {
        this.intention = -1;
      }

      this.previousVisual = this.nextVisual;

      if (this.shiftRandom) {
        this.nextVisual = this.randomIndex();

        if (this.nextVisual > this.previousVisual) {
          this.direction = 1;
        } else if (this.nextVisual < this.previousVisual) {
          this.direction = -1;
        } else {
          this.direction = 0;
        }
        
        if (this.shiftRandom === 'first') {
          this.shiftRandom = false;
        }
      } else if (--this.nextVisual < 0) {
        this.direction = 1;
        this.nextVisual = this.data.length - 1;
      } else {
        this.direction = -1;
      }

      this.load();
      
      this.trigger('previous');
    },

    goto: function(index) {

      this.intention = 0;

      if (this.nextVisual !== index) {
        this.previousVisual = this.nextVisual;
        this.nextVisual = index;

        if (this.nextVisual > this.previousVisual) {
          this.direction = 1;
        } else if (this.nextVisual < this.previousVisual) {
          this.direction = -1;
        } else {
          this.direction = 0;
        }

        this.load();
      } else {
        this.show();
      }
    },
    
    load: function(src, callback) {

      src = (typeof src === 'string') ? src : this.directory + this.data[this.nextVisual][this.entry];
      callback = (typeof callback === 'function') ? callback : this.exchange.bind(this);

      this.visual = new Image();
      this.visual.src = src;
      this.visual.onload = callback;
      
      this.trigger('load');  
    },

    exchange: function() {

      this.shifting = true;
      this.hidden = false;

      var dimensions = this.dimensions();
      
      var active = $(
        '.' + this.classPrefix + this.visualClass
        + '.' + this.classPrefix + this.activeClass
      );

      var inactive = $(
        '.' + this.classPrefix + this.visualClass
        + ':not(.' + this.classPrefix + this.activeClass + ')'
      );

      if (this.flip && this.intention > 0) {
        var rotationY = 90;
      } else if (this.flip && this.intention < 0) {
        var rotationY = -90;
      } else {
        var rotationY = 0;
      }

      if (this.flip) {
        var easeIn = Back.easeOut;
        var easeOut = Cubic.easeIn;
        var inDuration = this.visualDuration * 2;
        var outDuration = this.visualDuration;
      } else {
        var easeIn = Linear.easeNone;
        var easeOut = Linear.easeNone;
        var inDuration = this.visualDuration;
        var outDuration = this.visualDuration;
      }
      
      TweenLite.set(active, {
        rotationY: 0,
        zIndex: 2
      });
      
      active.removeClass(this.classPrefix + this.activeClass);

      TweenLite.set(inactive, {
        rotationY: -rotationY,
        display: 'block',
        opacity: 0,
        zIndex: 3
      });

      inactive.addClass(this.classPrefix + this.activeClass);

      this.container.css({
        display: 'block'
      });

      TweenLite.to(this.container, this.visualDuration, {
        opacity: 1,
        ease: Linear.easeNone
      });

      if (this.cssBackground) {
        inactive.css('background-image', 'url(' + this.visual.src + ')');
      } else {
        inactive.attr('src', this.visual.src);
      }

      function hide() {

        TweenLite.to(active, outDuration, {
          opacity: 0,
          rotationY: rotationY,
          transformPerspective: 3000,
          ease: easeOut,
          onComplete: size.bind(this)
        });
      }
      
      function show() {

        TweenLite.to(inactive, inDuration, {
          opacity: 1,
          rotationY: 0,
          transformPerspective: 3000,
          ease: easeIn,
          onComplete: function() {
            active.css({
              opacity: 0,
              display: 'none'
            });
            this.shifting = false;
            this.trigger('ready');
          }.bind(this)
        });
      }
      
      function size() {

        if (this.flip) {
          var ratio = dimensions.width / this.container.width();
          var duration = Math.abs(ratio - 1) * this.resizeDuration * 2;
        } else {
          var duration = this.resizeDuration;
        }

        TweenLite.to(this.container, duration, {
          width: dimensions.width,
          height: dimensions.height,
          ease: Back.easeOut,
          onComplete: show.bind(this)
        });
      }

      function set() {

        this.container.css({
          width: dimensions.width,
          height: dimensions.height,
          onComplete: show.bind(this)
        });

        active.css({
          opacity: 0,
          display: 'none'
        });

        inactive.css({
          opacity: 1,
          display: 'block'
        });

        show.call(this);
      }

      if (this.cssBackground && !this.flip) {
        show.call(this);
      } else if (this.resizeContainer || this.cssBackground) {
        hide.call(this);
      } else {
        set.call(this);
      }

      this.trigger('visual', {'visual': this.visual});
    },
    
    shift: function() {

      if (!this.running) {
        return;
      }

      if (this.shiftBackwards) {
        this.previous();
      } else {
        this.next();
      }

      this.delay();

      this.trigger('shift');
    },
    
    delay: function(callback) {

      callback = (typeof callback === 'function') ? callback : this.shift;

      if (this.resizeContainer) {
        var delay = (this.visualDuration * 2) + this.resizeDuration + this.shiftDelay;
      } else {
        var delay = this.visualDuration + this.shiftDelay;
      }

      setTimeout(callback.bind(this), delay * 1000);

      this.trigger('delay');
    },
    
    start: function() {

      if (this.data.length < 2 || this.running) {
        return;
      }
      
      this.running = true;
      
      if (this.nextVisual < 0) {
        this.next();
      }
      
      if (this.hidden) {
        this.show();
      }
      
      this.delay();

      this.trigger('start');
    },

    stop: function() {

      this.running = false;

      this.trigger('stop');
    },
    
    show: function() {

      if (!this.hidden) {
        return;
      }

      this.hidden = false;

      if (this.nextVisual < 0) {
        this.next();
      } else {
        TweenLite.to(this.container, this.visualDuration, {
          opacity: 1,
          ease: Linear.easeNone,
          onStart: function() {
            this.container.css({
              display: 'block'
            });
          }.bind(this),
          onComplete: function() {
            this.unsub();
            this.trigger('ready');
          }.bind(this)
        });
      }

      this.trigger('show');
    },

    hide: function() {

      if (this.hidden) {
        return;
      }

      this.hidden = true;
      
      TweenLite.to(this.container, this.visualDuration, {
        opacity: 0,
        ease: Linear.easeNone,
        onComplete: function() {
          this.container.css({
            display: 'none'
          });
        }.bind(this)
      });

      this.trigger('hide');
    },
    
    close: function() {

      this.unsub();

      this.hide();

      if (this.disposeOnClose) {
        setTimeout(this.dispose.bind(this), this.visualDuration * 1000);
      }

      this.trigger('close');
    },

    activate: function(event) {

      event.preventDefault();

      var element = $(event.currentTarget);
      
      this.size(element);
    },

    size: function(element) {

      if (this.sub) {
        this.unsub();
        return;
      }

      this.sub = element.clone();

      var top = element.offset().top - $(window).scrollTop();
      var left = element.offset().left - $(window).scrollLeft();
      var width = element.width();
      var height = element.height();

      var index = element.data('index');

      this.load(this.sub.attr('src'), animate.bind(this));

      function animate(event) {
        var dimensions = this.dimensions(this.visual);

        if (this.flip) {
          var rotationX = 0;
          var rotationY = -360;
          var rotationZ = 0;
        } else {
          var rotationX = 0;
          var rotationY = 0;
          var rotationZ = 0;
        }

        TweenLite.set(this.sub, {
          rotationX: rotationX,
          rotationY: rotationY,
          rotationZ: rotationZ
        });

        this.sub.css({
          position: 'fixed',
          top: top,
          left: left,
          width: width,
          height: height,
          margin: 0,
          padding: 0,
          border: 'none',
          zoom: '100%'
        });
        
        $('body').append(this.sub);

        TweenLite.to(this.sub, this.resizeDuration, {
          top: dimensions.y,
          left: dimensions.x,
          width: dimensions.width,
          height: dimensions.height,
          opacity: 1,
          rotationX: 0,
          rotationY: 0,
          rotationZ: 0,
          transformPerspective: 3000,
          //transformOrigin: 'right 50% -200',
          ease: Cubic.easeOut,
          onComplete: done.bind(this)
        });

        function done() {

          var resizeContainer = this.resizeContainer;
          this.resizeContainer = false;

          function restore(){
            this.resizeContainer = resizeContainer;
            this.unsub();
            this.off('ready.restore close.restore');
          }

          this.on('ready.restore close.restore', restore.bind(this));
          
          this.goto(index);

          this.trigger('size');
        }
      }
    },
    
    dimensions: function(visual) {

      var width, height;
      
      var windowWidth = $(window).width();
      var windowHeight = $(window).height();

      if (visual instanceof Image) {
        var imageWidth = visual.width;
        var imageHeight = visual.height;
      } else if (this.visual instanceof Image) {
        var imageWidth = this.visual.width;
        var imageHeight = this.visual.height;
      } else {
        return false;
      }

      var areaWidth = (windowWidth - (this.horizontalOffset * 2));
      var areaHeight = (windowHeight - (this.verticalOffset * 2));

      var maxWidth = this.maxWidth;
      var maxHeight = this.maxHeight;

      var imageRatio = imageWidth / imageHeight;
      var windowRatio = windowWidth / windowHeight;

      if (imageRatio > windowRatio) {
        if (imageWidth > areaWidth) {
          width = Math.min(areaWidth, maxWidth);
          height = width / imageRatio;
        } else {
          height = Math.min(imageHeight, maxHeight);
          width = height * imageRatio;
        }
      } else {
        if (imageHeight > areaHeight) {
          height = Math.min(areaHeight, maxHeight);
          width = height * imageRatio;
        } else {
          width = Math.min(imageWidth, maxWidth);
          height = width / imageRatio;
        }
      }

      var x = (windowWidth - width) / 2;
      var y = (windowHeight - height) / 2;

      return {
        x: parseInt(x),
        y: parseInt(y),
        width: parseInt(width),
        height: parseInt(height)
      };
    },
    
    resize: function() {

      if (this.shifting || !this.resizeContainer) {
        return;
      }

      var dimensions = this.dimensions();
      
      this.container.css({
        width: dimensions.width,
        height: dimensions.height
      });
      
      this.trigger('resize');
    },

    unsub: function() {

      if (this.sub) {
        this.sub.remove();
        this.sub = null;
      }
    },
    
    on: function() {

      if (this.dispatcher instanceof $) {
        this.dispatcher.on.apply(this.dispatcher, arguments);
      }
    },
    
    off: function() {

      if (this.dispatcher instanceof $) {
        this.dispatcher.off.apply(this.dispatcher, arguments);
      }
    },
    
    trigger: function() {

      if (this.dispatcher instanceof $) {
        this.dispatcher.trigger('all');
        this.dispatcher.trigger.apply(this.dispatcher, arguments);
      }
    },

    onKey: function(event) {

      if (event.type === 'keydown' && !this.hidden) {

        if (    event.keyCode === 39 
          || event.keyCode === 40
          || event.keyCode === 13
          || event.keyCode === 32
          || event.keyCode === 187
        ) {
          event.preventDefault();
          this.next();
        }

        if (    event.keyCode === 37
          || event.keyCode === 38
          || event.keyCode === 8
          || event.keyCode === 189
        ) {
          event.preventDefault();
          this.previous();
        }

        if (event.keyCode === 27) {
          event.preventDefault();
          this.close();
        }
      }
    },
    
    randomIndex: function() {

      var random = Math.floor(Math.random() * this.data.length);

      if (random === this.nextVisual) {
        return this.randomIndex();
      } else {
        return random;
      }
    },

    isRunning: function() {

      return this.running;
    },

    isShifting: function() {

      return this.shifting;
    },

    isHidden: function() {

      return this.hidden;
    },

    dispose: function() {

      $(window).off('resize', this.resize);

      this.unsub();

      this.off();

      this.container.remove();
    
      for(var member in this){
        if (this.hasOwnProperty(member)) {
          delete this[member];
        }
      }

      this.trigger('dispose');
    }
  }

  return scope.Viewer;

}(window, $, TweenLite));

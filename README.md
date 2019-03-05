## Observables
Performance optimized observable objects library

# Performance optimized observables typescript library, that helps to manage UI state in reactive way.
### Inspired by MOBX (https://mobx.js.org/).
### Although it is implemented using similar to MOBX concepts, and has similar api's, 
### it was re-written from scratch to achieve a significant performance increase - at both CPU and memory usage.
### In order to gain performance - Proxies and Object.defineProperty were not used in contrast to MOBX,
### as their current implementation in the modern browsers adds significant performance overhead. 
### In addition observable properties that decorators produce are generated on prototype level instead of object level,
### which provides gain in the speed of creating new objects as those properties generated only once on the prototype level,
### but also in terms of memory as again they are defined on a prototype level instead on object.
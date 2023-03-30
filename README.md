# Kubevious Backend
**Kubevious** brings clarity and safety to Kubernetes. Kubevious renders all configurations relevant to the application in one place. That saves a lot of time from operators, enforcing best practices, eliminating the need for looking up settings and digging within selectors and labels.

**Backend** is only one of the components required by Kubevious. Learn more about [Kubevious architecture here](https://github.com/kubevious/kubevious/blob/master/ARCHITECTURE.md).
![Kubevious High-Level Architecture](https://github.com/kubevious/kubevious/blob/master/diagrams/high-level-architecture.png?raw=true)


## Local Setup and Development
```sh
# Install NPM dependencies
$ npm install

# Run Kubevious Backend
$ ./run-dev.sh
```

Make sure to also run the **[Frontend](https://github.com/kubevious/ui#local-setup-and-development)** and **[Parser](https://github.com/kubevious/parser#local-setup-and-development)** components.
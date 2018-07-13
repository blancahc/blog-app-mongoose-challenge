'use strict';

const chai = require('chai');
const chaiHttp = require('chai-http');
const faker = require('faker');
const mongoose = require('mongoose');
mongoose.Promise = global.Promise;

//this makes the expect syntax available throughout this module
const expect = chai.expect;


const {
    Blogs
} = require('../models');
const {
    app,
    runServer,
    closeServer
} = require('../server');
const {
    TEST_DATABASE_URL
} = require('../config');

chai.use(chaiHttp);


// this function deletes the entire database.
// we'll call it in an `afterEach` block below to ensure data from one test does not stick around for next one
function tearDownDb() {
    console.warn('Deleting database');
    return mongoose.connection.dropDatabase();
}


describe('Blogs API resource', function () {

            // we need each of these hook functions to return a promise otherwise we'd need to call a `done` callback. `runServer`, 'seedBlogsData` and `tearDownDb` each return a promise,
            // so we return the value returned by these function calls.
            before(function () {
                return runServer(TEST_DATABASE_URL);
            });

            beforeEach(function () {
                return seedBlogsData();
            });

            afterEach(function () {
                return tearDownDb();
            });

            after(function () {
                return closeServer();
            });

            describe('GET endpoint', function () {

                it('should return all existing blogs', function () {
                    // strategy:
                    //    1. get back all blogs returned by GET request to `/posts`
                    //    2. prove res has right status, data type
                    //    3. prove the number of blogs we got back is equal to number
                    //       in db.
                    //
                    // need to have access to mutate and access `res` across
                    // `.then()` calls below, so declare it here so can modify in place
                    let res;
                    return chai.request(app)
                        .get('/posts')
                        .then(function (_res) {
                            // so subsequent .then blocks can access response object
                            res = _res;
                            expect(res).to.have.status(200);
                            // otherwise our db seeding didn't work
                            expect(res.body.blogs).to.have.lengthOf.at.least(1);
                            return Blogs.count();
                        })
                        .then(function (count) {
                            expect(res.body.blogs).to.have.lengthOf(count);
                        });
                });


                it('should return blogs with right fields', function () {
                    // Strategy: Get back all blogs, and ensure they have expected keys

                    let resBlogs;
                    return chai.request(app)
                        .get('/posts')
                        .then(function (res) {
                            expect(res).to.have.status(200);
                            expect(res).to.be.json;
                            expect(res.body.blogs).to.be.a('array');
                            expect(res.body.blogs).to.have.lengthOf.at.least(1);

                            res.body.blogs.forEach(function (blog) {
                                expect(blog).to.be.a('object');
                                expect(blog).to.include.keys(
                                    'id', 'title', 'author', 'content');
                            });
                            resBlogs = res.body.blogs[0];
                            return Blogs.findById(resBlogs.id);
                        })
                        .then(function (blog) {

                            expect(resBlogs.id).to.equal(blog.id);
                            expect(resBlogs.name).to.equal(blog.title);
                            expect(resBlogs.cuisine).to.equal(blog.author);
                            expect(resBlogs.borough).to.equal(blog.content);

                            expect(resBlogs.grade).to.equal(blog.grade);
                        });
                });
            });

            describe('POST endpoint', function () {
                // strategy: make a POST request with data,
                // then prove that the blog we get back has
                // right keys, and that `id` is there (which means
                // the data was inserted into db)
                it('should add a new blog', function () {

                    const newBlogs = generateBlogData();
                    let mostRecentTitle;

                    return chai.request(app)
                        .post('/posts')
                        .send(newBlogs)
                        .then(function (res) {
                            expect(res).to.have.status(201);
                            expect(res).to.be.json;
                            expect(res.body).to.be.a('object');
                            expect(res.body).to.include.keys(
                                'id', 'title', 'author', 'content');
                            expect(res.body.title).to.equal(newBlogs.title);
                            // cause Mongo should have created id on insertion
                            expect(res.body.id).to.not.be.null;
                            expect(res.body.author).to.equal(newBlogs.author);
                            expect(res.body.content).to.equal(newBlogs.content);


                            expect(res.body.title).to.equal(mostRecentTitle);
                            return Blogs.findById(res.body.id);
                        })
                        .then(function (blog) {
                            expect(blog.title).to.equal(mostRecentTitle);
                            expect(blog.author).to.equal(newblog.author);
                            expect(blog.content).to.equal(newblog.content);
                        });
                });

                describe('PUT endpoint', function () {

                    // strategy:
                    //  1. Get an existing blog from db
                    //  2. Make a PUT request to update that blog
                    //  3. Prove blog returned by request contains data we sent
                    //  4. Prove blog in db is correctly updated
                    it('should update fields you send over', function () {
                        const updateData = {
                            title: 'fofofofofofofof',
                            content: 'futuristic fusion'
                        };

                        return Blogs
                            .findOne()
                            .then(function (blog) {
                                updateData.id = blog.id;

                                // make request then inspect it to make sure it reflects
                                // data we sent
                                return chai.request(app)
                                    .put(`/posts/${blog.id}`)
                                    .send(updateData);
                            })
                            .then(function (res) {
                                expect(res).to.have.status(204);

                                return Blogs.findById(updateData.id);
                            })
                            .then(function (blog) {
                                expect(blog.tiel).to.equal(updateData.title);
                                expect(blog.content).to.equal(updateData.content);
                            });
                    });
                });

                describe('DELETE endpoint', function () {
                    // strategy:
                    //  1. get a blog
                    //  2. make a DELETE request for that blogs's id
                    //  3. assert that response has right status code
                    //  4. prove that blog with the id doesn't exist in db anymore
                    it('delete a blog by id', function () {

                        let blog;

                        return Blog
                            .findOne()
                            .then(function (_blog) {
                                blog = _blog;
                                return chai.request(app).delete(`/posts/${blog.id}`);
                            })
                            .then(function (res) {
                                expect(res).to.have.status(204);
                                return Blogs.findById(blog.id);
                            })
                            .then(function (_blog) {
                                expect(_blog).to.be.null;
                            });
                    });
                });
            });

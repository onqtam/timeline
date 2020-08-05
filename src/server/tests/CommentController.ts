import chai from "chai";
import chaiHttp from "chai-http";
import server from "../main";

chai.use(chaiHttp);
const should = chai.should();

describe("CommentController", () => {
    describe("GET Comments", () => {
        it("Fetch Comments for a given episode", (done) => {
            chai.request(server.app)
                .get("/comments")
                .send({ episodeId: 123, intervalStart: 0, intervalDuration: 600 })
                .end((err, res) => {
                    should.not.exist(err);
                    res.should.have.status(200);
                    res.body.should.be.an("array");
                    done();
                });
        });
    });
});

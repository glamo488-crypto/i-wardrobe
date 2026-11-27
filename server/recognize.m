#import <Foundation/Foundation.h>
#import <Vision/Vision.h>
#import <ImageIO/ImageIO.h>
#import <stdlib.h>

int main(void) {
    @autoreleasepool {
        NSData *bytes = [[NSFileHandle fileHandleWithStandardInput] readDataToEndOfFile];
        NSMutableDictionary *suggestion = [NSMutableDictionary dictionary];
        VNClassifyImageRequest *request = [VNClassifyImageRequest new];
        VNImageRequestHandler *handler = [[VNImageRequestHandler alloc] initWithData:bytes options:@{}];
        if (![handler performRequests:@[request] error:NULL]) return 1;

        NSDictionary *categories = @{
            @"鞋履": @[@"shoe", @"sneaker", @"loafer", @"footwear", @"boot", @"sandal"],
            @"裤装": @[@"trouser", @"trousers", @"pants", @"jeans", @"leggings"],
            @"外套": @[@"jacket", @"coat", @"blazer", @"outerwear"],
            @"上衣": @[@"shirt", @"sweater", @"blouse", @"cardigan", @"hoodie", @"topwear"]
        };
        for (VNClassificationObservation *result in request.results) {
            if (result.confidence < 0.15) continue;
            NSArray *words = [result.identifier.lowercaseString componentsSeparatedByCharactersInSet:
                NSCharacterSet.letterCharacterSet.invertedSet];
            for (NSString *category in categories) {
                if ([words indexesOfObjectsPassingTest:^BOOL(NSString *word, NSUInteger index, BOOL *stop) {
                    return [categories[category] containsObject:word];
                }].count) {
                    suggestion[@"category"] = category;
                    break;
                }
            }
            if (suggestion[@"category"]) break;
        }

        CGImageSourceRef source = CGImageSourceCreateWithData((__bridge CFDataRef)bytes, NULL);
        CGImageRef image = source ? CGImageSourceCreateImageAtIndex(source, 0, NULL) : NULL;
        unsigned char pixels[16 * 16 * 4] = {0};
        CGColorSpaceRef space = CGColorSpaceCreateDeviceRGB();
        CGContextRef context = CGBitmapContextCreate(pixels, 16, 16, 8, 64, space, kCGImageAlphaPremultipliedLast);
        if (image && context) {
            CGContextDrawImage(context, CGRectMake(0, 0, 16, 16), image);
            int rgb[3] = {0};
            int count = 0;
            for (int row = 5; row < 11; row++) {
                for (int column = 5; column < 11; column++) {
                    const unsigned char *pixel = &pixels[(row * 16 + column) * 4];
                    if (pixel[3] < 128) continue;
                    for (int channel = 0; channel < 3; channel++) rgb[channel] += pixel[channel];
                    count++;
                }
            }
            if (count) suggestion[@"color"] = [NSString stringWithFormat:@"#%02x%02x%02x",
                rgb[0] / count, rgb[1] / count, rgb[2] / count];
        }
        if (context) CGContextRelease(context);
        CGColorSpaceRelease(space);
        if (image) CGImageRelease(image);
        if (source) CFRelease(source);
        NSData *json = [NSJSONSerialization dataWithJSONObject:suggestion options:0 error:NULL];
        if (!json) return 1;
        [[NSFileHandle fileHandleWithStandardOutput] writeData:json];
    }
    return 0;
}
